#!/usr/bin/env bash
# Builds DuckDB with wasi-sdk (plain clang, no emscripten) into a single wasm32-wasip1 module with the SQL runner
# of wasi/main.cpp: parquet and tpch linked statically, exceptions, single-threaded.
#
#   scripts/wasi_build.sh [exnref|legacy|wasm64|threads|threads64|host|hostthreads]
#
# The exception encoding is the one thing engines disagree on: wasmtime runs exnref, wasm2c translates legacy.
# wasm64: the 64-bit sandbox (legacy encoding, for wasm2c), against the sysroot of scripts/wasm64_sysroot.sh;
# its syscalls carry 64-bit pointers, which only our hosts speak.
# threads: wasm32-wasip1-threads with DuckDB's threads (legacy encoding, for wasm2c --enable-threads); the module
# imports a shared memory the host owns and spawns threads through wasi:thread-spawn.
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
  threads) EH_FLAGS="-fwasm-exceptions"; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-threads ;;
  threads64) EH_FLAGS="-fwasm-exceptions"; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-threads64 ;;
  host) EH_FLAGS=""; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-host ;;
  hostthreads) EH_FLAGS=""; BUILD_DIR=${PROJECT_ROOT}/build/wasi/duckdb-hostthreads ;;
  *) echo "unknown target '${EH}', expected exnref, legacy or host"; exit 1 ;;
esac
if [ "${EH}" = host ] || [ "${EH}" = hostthreads ]; then
  HOST_THREAD_FLAGS="-DDUCKDB_NO_THREADS=1"
  [ "${EH}" = hostthreads ] && HOST_THREAD_FLAGS=""
  cmake -G Ninja -S "${DUCKDB}" -B "${BUILD_DIR}" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_STANDARD=17 \
    -DBUILD_EXTENSIONS="parquet;tpch" \
    -DSTATICALLY_LINK_EXTENSIONS="core_functions;parquet;tpch;json;icu" \
    -DENABLE_JEMALLOC=OFF -DBUILD_SHELL=FALSE -DBUILD_UNITTESTS=FALSE \
    -DDUCKDB_CAPABILITIES=none -DENABLE_BUILTIN_HTTPLIB=OFF \
    -DCMAKE_CXX_FLAGS="${HOST_THREAD_FLAGS} -Wno-unqualified-std-cast-call"
  cmake --build "${BUILD_DIR}" --target duckdb_static duckdb_cpp_api parquet_extension tpch_extension \
    core_functions_extension json_extension icu_extension
  LIBS="$(find "${BUILD_DIR}" -name libduckdb_cpp_api.a) $(find "${BUILD_DIR}" -name libduckdb_static.a)"
  LIBS="${LIBS} $(find "${BUILD_DIR}" -name 'libduckdb_*.a' | grep -v 'cpp_api\|static\|loadable\|local_extension' | tr '\n' ' ')"
  EXTENSIONS="$(find "${BUILD_DIR}" -name 'lib*_extension.a' | tr '\n' ' ')"
  OUT=${PROJECT_ROOT}/build/wasi/duckdb_${EH}
  clang++ -std=c++17 -O2 ${HOST_THREAD_FLAGS} -I"${DUCKDB}/src/include" \
    "${PROJECT_ROOT}/wasi/main.cpp" "${PROJECT_ROOT}/wasi/crash.cpp" \
    ${EXTENSIONS} ${LIBS} ${LIBS} -o "${OUT}"
  ls -la "${OUT}"
  exit 0
fi
# wasi-libc emulates what the sandbox has no business doing for real
EMULATED="-D_WASI_EMULATED_MMAN -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_GETPID"
# wasm SIMD: without it nothing in the module vectorizes, while the native build gets NEON everywhere; wasm2c
# translates it through SIMDe (--enable-simd) and wasmtime runs it. SIMD_FLAGS="" builds the scalar module.
SIMD_FLAGS=${SIMD_FLAGS--msimd128}
EMULATED_LIBS="-lwasi-emulated-mman -lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-getpid"

TOOLCHAIN=("-DCMAKE_TOOLCHAIN_FILE=${SDK}/share/cmake/wasi-sdk-p1.cmake")
TARGET_FLAGS="--target=wasm32-wasip1"
CXX_EXTRA=""
THREAD_FLAGS="-DDUCKDB_NO_THREADS=1"
LINK_EXTRA=""
MAX_MEMORY=4294967296
if [ "${EH}" = threads ]; then
  TOOLCHAIN=("-DCMAKE_TOOLCHAIN_FILE=${PROJECT_ROOT}/wasi/cmake/wasm32-wasip1-threads.cmake" "-DWASI_SDK_PREFIX=${SDK}")
  TARGET_FLAGS="--target=wasm32-wasip1-threads -pthread"
  THREAD_FLAGS="-pthread"
  # one shared memory, owned and handed in by the host, shared by the instance of every thread
  LINK_EXTRA="-Wl,--import-memory -Wl,--shared-memory"
fi
if [ "${EH}" = threads64 ]; then
  WASM64=${PROJECT_ROOT}/build/wasm64
  TOOLCHAIN=("-DCMAKE_TOOLCHAIN_FILE=${PROJECT_ROOT}/wasi/cmake/wasm64-wasip1-threads.cmake" "-DWASI_SDK_PREFIX=${SDK}"
             "-DWASM64_SYSROOT=${WASM64}/sysroot64")
  TARGET_FLAGS="--target=wasm64-wasip1-threads -pthread --sysroot ${WASM64}/sysroot64 -isystem ${WASM64}/sysroot64/include/wasm64-wasip1-threads/c++/v1"
  CXX_EXTRA="-isystem ${WASM64}/sysroot64/include/wasm64-wasip1-threads/c++/v1"
  THREAD_FLAGS="-pthread"
  LINK_EXTRA="-Wl,--import-memory -Wl,--shared-memory"
  MAX_MEMORY=17179869184
fi
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
# wasi-libc's dlmalloc serializes every malloc and free of every thread on one lock, a sched_yield spin that
# capped the threaded sandbox at about four busy threads: the threaded modules allocate through mimalloc
# instead, thread-local heaps on top of memory.grow (so still inside the module's memory cap). mimalloc v2.2.4
# plus wasi/mimalloc-wasi-threads.patch (pthread locks on wasi when compiled with -pthread).
MIMALLOC_LIBS=""
if [ "${EH}" = threads ] || [ "${EH}" = threads64 ]; then
  MIMALLOC_SRC=${PROJECT_ROOT}/build/mimalloc-src
  if [ ! -d "${MIMALLOC_SRC}" ]; then
    git clone --depth 1 --branch v2.2.4 https://github.com/microsoft/mimalloc.git "${MIMALLOC_SRC}"
    git -C "${MIMALLOC_SRC}" apply "${PROJECT_ROOT}/wasi/mimalloc-wasi-threads.patch"
  fi
  MIMALLOC_DIR=${PROJECT_ROOT}/build/wasi/mimalloc-${EH}
  if [ ! -f "${MIMALLOC_DIR}/libmimalloc.a" ]; then
    # (mimalloc is C; the C++ compiler check still links, and the wasm64 libc++ lives in the eh/ directory)
    cmake -G Ninja -S "${MIMALLOC_SRC}" -B "${MIMALLOC_DIR}" "${TOOLCHAIN[@]}" -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_EXE_LINKER_FLAGS=-fwasm-exceptions \
      -DMI_BUILD_SHARED=OFF -DMI_BUILD_OBJECT=OFF -DMI_BUILD_TESTS=OFF -DMI_OVERRIDE=ON -DMI_USE_LIBATOMIC=OFF
    cmake --build "${MIMALLOC_DIR}"
  fi
  # first on the link line: its malloc family wins over libc's
  MIMALLOC_LIBS="-L${MIMALLOC_DIR} -lmimalloc"
fi
cmake -G Ninja -S "${DUCKDB}" -B "${BUILD_DIR}" \
  "${TOOLCHAIN[@]}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
  -DCMAKE_CXX_STANDARD=17 \
  -DBUILD_EXTENSIONS="parquet;tpch;httpfs" \
  -DSTATICALLY_LINK_EXTENSIONS="core_functions;parquet;tpch;json;icu;httpfs" \
  -DDUCKDB_EXTENSION_CONFIGS="${PROJECT_ROOT}/wasi/extension_config.cmake" -DWASI_SANDBOX=1 \
  -DENABLE_JEMALLOC=OFF -DBUILD_SHELL=FALSE -DBUILD_UNITTESTS=FALSE \
  -DDUCKDB_CAPABILITIES=none -DENABLE_BUILTIN_HTTPLIB=OFF \
  -DDUCKDB_EXPLICIT_PLATFORM=wasm_wasi \
  -DCMAKE_CXX_FLAGS="${EH_FLAGS} ${CXX_EXTRA} ${THREAD_FLAGS} ${SIMD_FLAGS} ${EMULATED} -Wno-unqualified-std-cast-call" \
  -DCMAKE_C_FLAGS="${EMULATED} ${THREAD_FLAGS} ${SIMD_FLAGS}" \
  -DCMAKE_EXE_LINKER_FLAGS="-fwasm-exceptions -lunwind ${LINK_EXTRA}"
# The loadable extension targets do not link (no --version-script in wasm-ld) and are not wanted
cmake --build "${BUILD_DIR}" --target duckdb_static duckdb_cpp_api parquet_extension tpch_extension \
  core_functions_extension json_extension icu_extension httpfs_extension

LIBS="$(find "${BUILD_DIR}" -name libduckdb_cpp_api.a) $(find "${BUILD_DIR}" -name libduckdb_static.a)"
LIBS="${LIBS} $(find "${BUILD_DIR}" -name 'libduckdb_*.a' | grep -v 'cpp_api\|static\|loadable\|local_extension' | tr '\n' ' ')"
# The extension archives; wasi/main.cpp registers them through their describe functions
EXTENSIONS="$(find "${BUILD_DIR}" -name 'lib*_extension.a' | tr '\n' ' ')"
OUT=${PROJECT_ROOT}/build/wasi/duckdb_wasi-${EH}.wasm
# 8 MB of stack like a native process, up to the 4 GB a 32-bit sandbox can address. wasi-sdk places the stack
# first, so the lowest page of memory is the far end of the stack: a host can make it inaccessible, and a null
# dereference (or a stack overflow) traps instead of landing in linear memory
"${SDK}/bin/clang++" ${TARGET_FLAGS} -O2 ${EH_FLAGS} ${THREAD_FLAGS} ${SIMD_FLAGS} ${EMULATED} \
  -I"${DUCKDB}/src/include" -I"${PROJECT_ROOT}/build/duckdb-httpfs/src/include" \
  "${PROJECT_ROOT}/wasi/main.cpp" "${PROJECT_ROOT}/wasi/crash.cpp" "${PROJECT_ROOT}/wasi/http_client.cpp" \
  "${PROJECT_ROOT}/wasi/wasi_compat.c" \
  ${MIMALLOC_LIBS} ${EXTENSIONS} ${LIBS} ${LIBS} -lunwind ${EMULATED_LIBS} \
  -Wl,-z,stack-size=8388608 -Wl,--max-memory=${MAX_MEMORY} ${LINK_EXTRA} \
  -Wl,-Map="${OUT}.map" --no-wasm-opt \
  -o "${OUT}"
# clang would run wasm-opt -O2 itself when it finds one; it is run here so that WASM_NAMES=1 can keep the name
# section (-g), which makes wasm2c's C and native profiles carry the DuckDB symbols. With -g wasm-opt merges
# fewer duplicate functions (57k instead of 36k of 70k), so names are for profiling builds only. The DWARF
# (libc's only) goes either way, it is of no use to the translated binary.
if command -v wasm-opt > /dev/null; then
  if [ "${WASM_NAMES:-0}" = 1 ]; then
    wasm-opt "${OUT}" -O2 -g --strip-dwarf -o "${OUT}"
  else
    wasm-opt "${OUT}" -O2 --strip-dwarf -o "${OUT}"
  fi
fi
ls -la "${OUT}"
