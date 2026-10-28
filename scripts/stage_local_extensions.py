#!/usr/bin/env python3

import shutil
import sys
from pathlib import Path


LOCAL_EXTENSIONS = {"httpfs", "aws", "quack"}
PLATFORMS = {"base": "wasm_eh", "threads": "wasm_threads"}


def metadata(path):
    with path.open("rb") as module:
        if module.read(4) != b"\0asm":
            raise ValueError(f"Not a Wasm module: {path}")
        module.seek(-512, 2)
        footer = module.read(256)
    fields = [footer[index:index + 32].rstrip(b"\0").decode() for index in range(0, 256, 32)]
    if fields[7] != "4":
        raise ValueError(f"Missing DuckDB extension metadata: {path}")
    return fields[5], fields[6]


def stage(build, mode, variant, selected, suffix=""):
    if suffix not in ("", "-ninja") or variant not in PLATFORMS:
        raise ValueError(f"Unknown build variant: {variant}{suffix}")
    if set(selected) - LOCAL_EXTENSIONS:
        raise ValueError(f"Unknown local extensions: {selected}")
    directory = variant + suffix
    core = build / mode / directory / "third_party/duckdb/src/duckdb_ep-build/extension"
    expected = metadata(core / "json/json.duckdb_extension.wasm")
    if expected[1] != PLATFORMS[variant]:
        raise ValueError(f"Main-module extension platform is {expected[1]}, expected {PLATFORMS[variant]}")
    modules = [path for path in core.glob("*/*.duckdb_extension.wasm") if path.parent.name not in LOCAL_EXTENSIONS]
    modules.extend(
        build / "local_extensions" / name / directory / "extension" / name / f"{name}.duckdb_extension.wasm"
        for name in selected
    )
    for module in modules:
        if metadata(module) != expected:
            raise ValueError(f"Version/platform mismatch: {module}, expected {expected}")

    repository = build / "extension_repository"
    destination = repository / expected[0] / expected[1]
    destination.mkdir(parents=True, exist_ok=True)
    for module in modules:
        shutil.copyfile(module, destination / module.name)
    # The core build can copy obsolete artifacts from earlier configurations into this directory.
    for name in LOCAL_EXTENSIONS - set(selected):
        (destination / f"{name}.duckdb_extension.wasm").unlink(missing_ok=True)
    return repository


if __name__ == "__main__":
    if len(sys.argv) < 5:
        sys.exit("Usage: stage_local_extensions.py <build-directory> <mode> <variant> <suffix> [httpfs] [aws] [quack]")
    try:
        repository = stage(Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3], sys.argv[5:], sys.argv[4])
        print(f"Extension repository: {repository}")
    except (OSError, ValueError) as error:
        sys.exit(str(error))
