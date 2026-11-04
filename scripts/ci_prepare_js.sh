#!/usr/bin/env bash

# Prepare a fresh CI checkout for jobs consuming prebuilt Wasm artifacts.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# dbgen needs its distribution data alongside the downloaded executable.
git submodule update --init --depth 1 -- submodules/tpch-dbgen

# The version badge needs the engine's tag history, but no JavaScript job builds
# the engine. A bare repository keeps git describe working without source blobs
# or a worktree. Fetch the pinned commit as well as tags: it need not be on main.
ENGINE_SHA=$(git rev-parse HEAD:submodules/duckdb)
ENGINE_URL=$(git config -f .gitmodules submodule.submodules/duckdb.url)
ENGINE_DIR="$PROJECT_ROOT/submodules/duckdb"
if [ -e "$ENGINE_DIR/.git" ]; then
    echo "ci_prepare_js.sh requires an uninitialized DuckDB submodule" >&2
    exit 1
fi
git init --bare "$ENGINE_DIR"
git -C "$ENGINE_DIR" remote add origin "$ENGINE_URL"
git -C "$ENGINE_DIR" fetch --filter=blob:none --no-recurse-submodules origin \
    "$ENGINE_SHA" '+refs/tags/*:refs/tags/*'
git -C "$ENGINE_DIR" update-ref HEAD "$ENGINE_SHA"
