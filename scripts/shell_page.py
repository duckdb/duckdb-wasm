#!/usr/bin/env python3
"""Keep the web shell page of the gh-pages branch consistent before a push.

Usage: shell_page.py rename <gh-pages checkout>
       shell_page.py check <gh-pages checkout>
       shell_page.py upgrade-terminal [checkout] --xterm VERSION --addon-fit VERSION

rename gives each script that index.html loads from static/shell/ the first 10 hex digits of its SHA-256
in its name, updates index.html, then runs the check. Run it after every edit of such a script: the site
caches /static/ for hours and index.html for minutes, so a script changed under its old name would run
with a newer page.

check exits non-zero and lists what does not fit together.
upgrade-terminal downloads exact npm versions and updates the files, HTML URLs and checksum entries.
Either version option can be omitted to upgrade only the other package. It preserves old version folders.
"""

import argparse
import ast
import base64
import hashlib
import io
import json
import re
import tarfile
import urllib.error
import urllib.request
from pathlib import Path

SHELL = "static/shell"
ASSET_ATTRIBUTES = ["data-shell-js", "data-shell-wasm", "data-worker", "data-engine"]
# npm package members: @xterm/xterm (lib/xterm.js, css/xterm.css), @xterm/addon-fit (lib/addon-fit.js).
VENDORED = {
    "static/vendor/xterm-5.5.0/xterm.js": "sha256-H5kaw7Syg+v5bmCuI6AKUnZd06Lkb6b92p8aqwMvdJU=",
    "static/vendor/xterm-5.5.0/xterm.css": "sha256-uo5phWaUiJgcz0DAzv46uoByLLbJLeetYosL1xf68rY=",
    "static/vendor/addon-fit-0.10.0/addon-fit.js": "sha256-va76Nwsb/ELuiNRv5gckAJAqTUstRc2TQ43amyPJcIk=",
}
COMMENT = re.compile(r"<!--.*?-->", re.S)
SCRIPT_TAG = re.compile(r"<script\b(?P<attributes>[^>]*)>")
SRC = re.compile(r'\bsrc="(?P<url>[^"]*)"')
SHELL_URL = re.compile(r"^(?P<prefix>\.?/)" + SHELL + r"/(?P<name>(?P<stem>[a-z0-9-]+)(?:\.[0-9a-f]{10})?\.js)$")
FILE_URL = re.compile(rb"static/(assets|shell|vendor)/")
PACKAGES = {
    "xterm": ("@xterm/xterm", ("package/lib/xterm.js", "package/css/xterm.css")),
    "addon-fit": ("@xterm/addon-fit", ("package/lib/addon-fit.js",)),
}


def hashed_name(stem, data):
    return f"{stem}.{hashlib.sha256(data).hexdigest()[:10]}.js"


def script_tags(html):
    """The attributes and the src of each <script> tag outside a comment."""
    tags = []
    for tag in SCRIPT_TAG.finditer(COMMENT.sub("", html)):
        src = SRC.search(tag.group("attributes"))
        tags.append((tag.group("attributes"), src.group("url") if src else None))
    return tags


def rename(root):
    index = root / "index.html"
    html = index.read_text()
    renamed = []
    for _, url in script_tags(html):
        shell = SHELL_URL.match(url or "")
        if not shell:
            continue
        old = shell.group("name")
        new = hashed_name(shell.group("stem"), (root / SHELL / old).read_bytes())
        if new != old:
            (root / SHELL / old).rename(root / SHELL / new)
            html = html.replace(f'src="{url}"', f'src="{shell.group("prefix")}{SHELL}/{new}"')
            renamed.append((old, new))
    if renamed:
        index.write_text(html)
    return renamed


def check(root, vendored=VENDORED):
    html = (root / "index.html").read_text()
    problems = []
    loaded = {}
    for attributes, url in script_tags(html):
        shell = SHELL_URL.match(url or "")
        if url is None:
            problems.append("index.html has an inline <script>: the page policy runs scripts from files only")
        elif shell:
            loaded[shell.group("name")] = (shell.group("stem"), shell.group("prefix"), attributes)
        elif url.removeprefix("./") not in vendored:
            problems.append(f"index.html loads a script from outside {SHELL}/ and static/vendor/: {url}")

    for path in sorted((root / SHELL).iterdir()):
        if path.name not in loaded:
            problems.append(f"{SHELL}/{path.name} is not loaded by index.html")
    for name, (stem, prefix, attributes) in loaded.items():
        path = root / SHELL / name
        if not path.is_file():
            problems.append(f"index.html loads {SHELL}/{name}, which does not exist")
            continue
        data = path.read_bytes()
        if name != hashed_name(stem, data):
            problems.append(f"{SHELL}/{name} is not named after its content: run shell_page.py rename")
        if FILE_URL.search(data):
            problems.append(f"{SHELL}/{name} contains a file URL: those belong in index.html, which is cached for minutes")
        # index.html is also the document at /oauth/callback, where "./static/..." does not exist.
        if stem == "oauth-callback" and prefix != "/":
            problems.append(f"{SHELL}/{name} is loaded with a relative URL: at /oauth/callback it would not load")
        if stem == "shell-boot":
            for attribute in ASSET_ATTRIBUTES:
                value = re.search(rf'\b{attribute}="\./(static/assets/[^"]+)"', attributes)
                if not value:
                    problems.append(f"the shell-boot tag has no {attribute} with a ./static/assets/ URL")
                elif not (root / value.group(1)).is_file():
                    problems.append(f"{attribute} names a file that does not exist: {value.group(1)}")
    if "shell-boot" not in {stem for stem, _, _ in loaded.values()}:
        problems.append("index.html does not load shell-boot")

    tags = COMMENT.sub("", html)
    for file, digest in vendored.items():
        path = root / file
        if not path.is_file():
            problems.append(f"{file} does not exist")
            continue
        actual = "sha256-" + base64.b64encode(hashlib.sha256(path.read_bytes()).digest()).decode()
        if actual != digest:
            problems.append(f"{file} is not the file of its npm package: {actual}, expected {digest}")
        if f'"./{file}"' not in tags:
            problems.append(f"index.html does not load {file}")
        if not (path.parent / "LICENSE").is_file():
            problems.append(f"{Path(file).parent}/ has no LICENSE")
    return problems


def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def upgrade_terminal(root, versions, download=fetch):
    if not versions or set(versions) - PACKAGES.keys():
        raise ValueError("Choose an xterm or addon-fit version")
    for folder, version in versions.items():
        if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?", version):
            raise ValueError(f"Use an exact version, not a tag or range: {version}")
        destination = root / "static/vendor" / f"{folder}-{version}"
        if destination.exists():
            raise ValueError(f"{destination} already exists; choose a new version")

    index = root / "index.html"
    tool = root / "scripts/shell_page.py"
    html = index.read_text()
    source = tool.read_text()
    block = re.search(r"^VENDORED = (\{.*?^\})", source, re.M | re.S)
    if not block:
        raise ValueError(f"Cannot find VENDORED in {tool}")
    pins = ast.literal_eval(block[1])
    problems = check(root, pins)
    if problems:
        raise ValueError("Fix the page before upgrading:\n" + "\n".join(problems))

    files = {}
    destinations = []
    for folder, version in versions.items():
        package, members = PACKAGES[folder]
        metadata = json.loads(download(f"https://registry.npmjs.org/{package}/{version}"))
        if metadata.get("name") != package or metadata.get("version") != version:
            raise ValueError(f"Unexpected package or version returned for {package}@{version}")
        dist = metadata["dist"]
        if not dist["tarball"].startswith("https://registry.npmjs.org/"):
            raise ValueError(f"Unexpected tarball host for {package}")
        archive = download(dist["tarball"])
        integrity = "sha512-" + base64.b64encode(hashlib.sha512(archive).digest()).decode()
        if integrity != dist["integrity"]:
            raise ValueError(f"Tarball integrity mismatch: {package}@{version}")
        destination = Path(f"static/vendor/{folder}-{version}")
        destinations.append(destination)
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
            for member in ("package/LICENSE", *members):
                if not tar.getmember(member).isfile():
                    raise ValueError(f"{package}: {member} is not a regular file")
                data = tar.extractfile(member).read()
                name = Path(member).name
                new = (destination / name).as_posix()
                files[new] = data
                if name == "LICENSE":
                    continue
                matches = [old for old in pins if Path(old).name == name]
                if len(matches) != 1:
                    raise ValueError(f"Cannot identify the existing checksum entry for {name}")
                old = matches[0]
                if html.count(f'"./{old}"') != 1:
                    raise ValueError(f"Expected one reference to {old} in index.html")
                html = html.replace(f'"./{old}"', f'"./{new}"')
                digest = "sha256-" + base64.b64encode(hashlib.sha256(data).digest()).decode()
                pins = {new if file == old else file: digest if file == old else value
                        for file, value in pins.items()}

    replacement = "VENDORED = {\n" + "".join(f'    "{file}": "{digest}",\n' for file, digest in pins.items()) + "}"
    source = source[:block.start()] + replacement + source[block.end():]
    # Finish downloads and validation before writing anything to the checkout.
    for destination in destinations:
        (root / destination).mkdir()
    for file, data in files.items():
        (root / file).write_bytes(data)
    index.write_text(html)
    tool.write_text(source)
    problems = check(root, pins)
    if problems:
        raise ValueError("Check failed after upgrading:\n" + "\n".join(problems))
    return [f"{PACKAGES[folder][0]}@{version}" for folder, version in versions.items()]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("rename", "check"):
        commands.add_parser(command).add_argument("checkout", type=Path)
    upgrade = commands.add_parser("upgrade-terminal")
    upgrade.add_argument("checkout", type=Path, nargs="?", default=Path("."))
    upgrade.add_argument("--xterm", metavar="VERSION")
    upgrade.add_argument("--addon-fit", metavar="VERSION")
    args = parser.parse_args()
    try:
        if args.command == "upgrade-terminal":
            versions = {name: value for name, value in (("xterm", args.xterm), ("addon-fit", args.addon_fit)) if value is not None}
            for package in upgrade_terminal(args.checkout, versions):
                print(f"Upgraded and checked {package}")
        else:
            if args.command == "rename":
                for old, new in rename(args.checkout):
                    print(f"renamed: {SHELL}/{old} -> {new}")
            problems = check(args.checkout)
            if problems:
                raise ValueError("\n".join(problems))
    except (OSError, ValueError, KeyError, SyntaxError, tarfile.TarError, urllib.error.URLError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
