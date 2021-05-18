#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

PRETTIER_WRITE_MODE="--check"
CLANG_FORMAT_WRITE_MODE="--dry-run -Werror"

if [ -z "${1:-}" ] || [ ! "$1" = "check" ]; then
    PRETTIER_WRITE_MODE="--write"
    CLANG_FORMAT_WRITE_MODE="-i"
fi

npx prettier \
    $PRETTIER_WRITE_MODE \
    "$PROJECT_ROOT/**/*.{js,json,ts,tsx,d.ts,css}" \
    --config "$PROJECT_ROOT/.prettierrc" \
    --ignore-path "$PROJECT_ROOT/.prettierignore"

find -E $PROJECT_ROOT \
    -regex '.*/(\..*|submodules|node_modules|install|build)/.*' -prune -o \
    -regex "$PROJECT_ROOT/proto/.*" -prune -o \
    -regex '.*\.(cc|h)' \
    -exec echo clang-format $CLANG_FORMAT_WRITE_MODE {} \; \
    -exec clang-format $CLANG_FORMAT_WRITE_MODE {} \;
