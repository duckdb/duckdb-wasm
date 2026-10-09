#!/usr/bin/env bash
# Builds DuckDB with wasi-sdk (plain clang, no emscripten) into a single wasm32-wasip1 module with the SQL runner
# of wasi/main.cpp: parquet and tpch linked statically, exceptions, single-threaded.
#
#   scripts/wasi_build.sh [exnref|legacy|wasm64|host]
#
# The exception encoding is the one thing engines disagree on: wasmtime runs exnref, wasm2c translates legacy.
# wasm64: the 64-bit sandbox (legacy encoding, for wasm2c), against the sysroot of scripts/wasm64_sysroot.sh;
# its syscalls carry 64-bit pointers, which only our hosts speak.
# host: the same sources, flags and runner built with the host clang for the host, the 64-bit native reference.
# Output: build/wasi/duckdb_wasi-<target>.wasm, or build/wasi/duckdb_host
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EH=${1:-exnref}
SDK=${WASI_SDK:-${PROJECT_ROOT}/build/wasi-sdk-34.0-arm64-macos}
DUCKDB=${PROJECT_ROOT}/submodules/duckdb
case ${EH} in
  exnref) EH_FLAGS="-fwasm-exceptions -mllvm -wasm-use-legacy-eh=false"; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-exnref ;;
  legacy) EH_FLAGS="-fwasm-exceptions"; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb ;;
  wasm64) EH_FLAGS="-fwasm-exceptions"; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-wasm64 ;;
  host) EH_FLAGS=""; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-host ;;
  *) echo "unknown target '${EH}', expected exnref, legacy or host"; exit 1 ;;
esac
if [ "${EH}" = host ]; then
  cmake -G Ninja -S "${DUCKDB}" -B "${BUILD_DIR}" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_STANDARD=17 \
    -DBUILD_EXTENSIONS="parquet;tpch" \
    -DSTATICALLY_LINK_EXTENSIONS="core_functions;parquet;tpch;json;icu" \
    -DENABLE_JEMALLOC=OFF -DBUILD_SHELL=FALSE -DBUILD_UNITTESTS=FALSE \
    -DDUCKDB_CAPABILITIES=none -DENABLE_BUILTIN_HTTPLIB=OFF \
    -DCMAKE_CXX_FLAGS="-DDUCKDB_NO_THREADS=1 -Wno-unqualified-std-cast-call"
  cmake --build "${BUILD_DIR}" --target duckdb_static duckdb_cpp_api parquet_extension tpch_extension \
    core_functions_extension json_extension icu_extension
  LIBS="$(find "${BUILD_DIR}" -name libduckdb_cpp_api.a) $(find "${BUILD_DIR}" -name libduckdb_static.a)"
  LIBS="${LIBS} $(find "${BUILD_DIR}" -name 'libduckdb_*.a' | grep -v 'cpp_api\|static\|loadable\|local_extension' | tr '\n' ' ')"
  EXTENSIONS="$(find "${BUILD_DIR}" -name 'lib*_extension.a' | tr '\n' ' ')"
  OUT=${PROJECT_ROOT}/build/wasi/duckdb_host
  clang++ -std=c++17 -O2 -DDUCKDB_NO_THREADS=1 -I"${DUCKDB}/src/include" \
    "${PROJECT_ROOT}/wasi/main.cpp" "${PROJECT_ROOT}/wasi/crash.cpp" \
    ${EXTENSIONS} ${LIBS} ${LIBS} -o "${OUT}"
  ls -la "${OUT}"
  exit 0
fi
# wasi-libc emulates what the sandbox has no business doing for real
EMULATED="-D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_GETPID"
EMULATED_LIBS="-lwasi-emulated-mman -lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-getpid"

TOOLCHAIN=("-DCMAKE_TOOLCHAIN_FILE=${SDK}/share/cmake/wasi-sdk-p1.cmake")
TARGET_FLAGS="--target=wasm32-wasip1"
CXX_EXTRA=""
MAX_MEMORY=4294967296
if [ "${EH}" = wasm64 ]; then
  WASM64=${PROJECT_ROOT}/build/wasm64
  TOOLCHAIN=("-DCMAKE_TOOLCHAIN_FILE=${PROJECT_ROOT}/wasi/cmake/wasm64-wasip1.cmake" "-DWASI_SDK_PREFIX=${SDK}"
             "-DWASM64_SYSROOT=${WASM64}/sysroot64")
  TARGET_FLAGS="--target=wasm64-wasip1 --sysroot ${WASM64}/sysroot64 -isystem ${WASM64}/sysroot64/include/wasm64-wasip1/c++/v1"
  # clang does not look for libc++ headers under a wasm64 multiarch directory on its own
  CXX_EXTRA="-isystem ${WASM64}/sysroot64/include/wasm64-wasip1/c++/v1"
  # 16 GB, the most wasm-ld accepts for a memory64 module; DuckDB's memory_limit and the host cap bound it below
  MAX_MEMORY=17179869184
fi
cmake -G Ninja -S "${DUCKDB}" -B "${BUILD_DIR}" \
  "${TOOLCHAIN[@]}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
  -DCMAKE_CXX_STANDARD=17 \
  -DBUILD_EXTENSIONS="parquet;tpch" \
  -DSTATICALLY_LINK_EXTENSIONS="core_functions;parquet;tpch;json;icu" \
  -DENABLE_JEMALLOC=OFF -DBUILD_SHELL=FALSE -DBUILD_UNITTESTS=FALSE \
  -DDUCKDB_CAPABILITIES=none -DENABLE_BUILTIN_HTTPLIB=OFF \
  -DDUCKDB_EXPLICIT_PLATFORM=wasm_wasi \
  -DCMAKE_CXX_FLAGS="${EH_FLAGS} ${CXX_EXTRA} -DDUCKDB_NO_THREADS=1 ${EMULATED} -Wno-unqualified-std-cast-call" \
  -DCMAKE_C_FLAGS="${EMULATED}" \
  -DCMAKE_EXE_LINKER_FLAGS="-fwasm-exceptions -lunwind"
# The loadable extension targets do not link (no --version-script in wasm-ld) and are not wanted
cmake --build "${BUILD_DIR}" --target duckdb_static duckdb_cpp_api parquet_extension tpch_extension \
  core_functions_extension json_extension icu_extension

LIBS="$(find "${BUILD_DIR}" -name libduckdb_cpp_api.a) $(find "${BUILD_DIR}" -name libduckdb_static.a)"
LIBS="${LIBS} $(find "${BUILD_DIR}" -name 'libduckdb_*.a' | grep -v 'cpp_api\|static\|loadable\|local_extension' | tr '\n' ' ')"
# The extension archives; wasi/main.cpp registers them through their describe functions
EXTENSIONS="$(find "${BUILD_DIR}" -name 'lib*_extension.a' | tr '\n' ' ')"
OUT=${PROJECT_ROOT}/build/wasi/duckdb_wasi-${EH}.wasm
# 8 MB of stack like a native process, up to the 4 GB a 32-bit sandbox can address. wasi-sdk places the stack
# first, so the lowest page of memory is the far end of the stack: a host can make it inaccessible, and a null
# dereference (or a stack overflow) traps instead of landing in linear memory
"${SDK}/bin/clang++" ${TARGET_FLAGS} -O2 ${EH_FLAGS} -DDUCKDB_NO_THREADS=1 ${EMULATED} \
  -I"${DUCKDB}/src/include" "${PROJECT_ROOT}/wasi/main.cpp" "${PROJECT_ROOT}/wasi/crash.cpp" \
  "${PROJECT_ROOT}/wasi/wasi_compat.c" \
  ${EXTENSIONS} ${LIBS} ${LIBS} -lunwind ${EMULATED_LIBS} \
  -Wl,-z,stack-size=8388608 -Wl,--max-memory=${MAX_MEMORY} \
  -o "${OUT}"
ls -la "${OUT}"
