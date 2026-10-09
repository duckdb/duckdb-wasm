#!/usr/bin/env bash
# A wasm64-wasip1 sysroot for the 64-bit sandbox, built with the clang of wasi-sdk 34 the way wasi-sdk builds
# its own: wasi-libc, compiler-rt builtins, libunwind, libc++abi and libc++ with exceptions. wasi-sdk ships no
# wasm64 sysroot because WASI preview1 has 32-bit pointers; this one drops wasi-libc's layout checks
# (wasi/wasi-libc-wasm64.patch): the syscalls keep their shape with 64-bit pointers and sizes, the
# "DuckDB-sandbox ABI" only our hosts implement.
#
#   scripts/wasm64_sysroot.sh            -- everything into build/wasm64/sysroot64
#
# The runtimes must come from the sdk's own LLVM commit (clang 23 still emits _Unwind_CallPersonality, which
# llvm main removed), with wasi-sdk-34's LLVM patches and two of ours (wasi/llvm-wasm64.patch).
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK=${WASI_SDK:-${PROJECT_ROOT}/build/wasi-sdk-34.0-arm64-macos}
LLVM_COMMIT=895aa2c896ada719451be2e3673c83da8ddf1141
W=${PROJECT_ROOT}/build/wasm64
SYSROOT=${W}/sysroot64
CLANG_VERSION=$(ls "${SDK}/lib/clang")
mkdir -p "${W}" && cd "${W}"

# wasi-libc, built for wasm64 with our patch
if [ ! -d wasi-libc ]; then
  git clone -q --depth 1 https://github.com/WebAssembly/wasi-libc.git
  (cd wasi-libc && patch -p1 --forward < "${PROJECT_ROOT}/wasi/wasi-libc-wasm64.patch")
fi
cmake -G Ninja -S wasi-libc -B wasi-libc-build -DTARGET_TRIPLE=wasm64-wasip1 -DCMAKE_SYSTEM_NAME=WASI \
  -DCMAKE_C_COMPILER="${SDK}/bin/clang" -DCMAKE_AR="${SDK}/bin/llvm-ar" -DCMAKE_RANLIB="${SDK}/bin/llvm-ranlib" \
  -DCMAKE_NM="${SDK}/bin/llvm-nm" -DCMAKE_INSTALL_PREFIX="${SYSROOT}" -DBUILD_SHARED=OFF -DBUILD_TESTS=OFF
cmake --build wasi-libc-build && cmake --install wasi-libc-build

# llvm-project at the sdk's commit: compiler-rt, libunwind, libc++abi, libc++
if [ ! -d llvm-project ]; then
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/llvm/llvm-project.git
  (cd llvm-project && git sparse-checkout set runtimes libcxx libcxxabi libunwind compiler-rt libc cmake llvm/cmake llvm/utils/llvm-lit \
    && git fetch -q --depth 1 origin ${LLVM_COMMIT} && git checkout -q FETCH_HEAD)
  mkdir -p patches34
  curl -s "https://api.github.com/repos/WebAssembly/wasi-sdk/contents/src?ref=wasi-sdk-34" \
    | python3 -c "import sys,json; [print(e['name']) for e in json.load(sys.stdin) if e['name'].endswith('.patch')]" > patches34/list.txt
  for p in $(cat patches34/list.txt); do
    curl -sL -o "patches34/${p}" "https://raw.githubusercontent.com/WebAssembly/wasi-sdk/wasi-sdk-34/src/${p}"
    (cd llvm-project && git apply "../patches34/${p}")
  done
  (cd llvm-project && git apply "${PROJECT_ROOT}/wasi/llvm-wasm64.patch")
fi

COMMON=(-DCMAKE_SYSTEM_NAME=WASI -DCMAKE_SYSTEM_VERSION=1 -DCMAKE_SYSTEM_PROCESSOR=wasm64 -DCMAKE_BUILD_TYPE=Release
  -DCMAKE_AR="${SDK}/bin/llvm-ar" -DCMAKE_C_COMPILER="${SDK}/bin/clang" -DCMAKE_CXX_COMPILER="${SDK}/bin/clang++"
  -DCMAKE_C_COMPILER_WORKS=ON -DCMAKE_CXX_COMPILER_WORKS=ON
  -DCMAKE_C_LINKER_DEPFILE_SUPPORTED=OFF -DCMAKE_CXX_LINKER_DEPFILE_SUPPORTED=OFF
  -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache -DCMAKE_SYSROOT="${SYSROOT}")

# The builtins go where clang looks for them, next to the sdk's wasm32 ones
RESOURCE_DIR=${W}/resource-dir
cmake -G Ninja -S llvm-project/compiler-rt -B compiler-rt-build "${COMMON[@]}" \
  -DLLVM_ENABLE_PER_TARGET_RUNTIME_DIR=ON -DCOMPILER_RT_BAREMETAL_BUILD=ON -DCOMPILER_RT_INCLUDE_TESTS=OFF \
  -DCOMPILER_RT_HAS_FPIC_FLAG=OFF -DCOMPILER_RT_DEFAULT_TARGET_ONLY=ON -DCOMPILER_RT_BUILD_SANITIZERS=OFF \
  -DCOMPILER_RT_BUILD_XRAY=OFF -DCOMPILER_RT_BUILD_LIBFUZZER=OFF -DCOMPILER_RT_BUILD_PROFILE=OFF \
  -DCOMPILER_RT_BUILD_CTX_PROFILE=OFF -DCOMPILER_RT_BUILD_MEMPROF=OFF -DCOMPILER_RT_BUILD_ORC=OFF \
  -DCOMPILER_RT_BUILD_GWP_ASAN=OFF -DCMAKE_C_COMPILER_TARGET=wasm64-wasip1 -DCMAKE_INSTALL_PREFIX="${RESOURCE_DIR}"
cmake --build compiler-rt-build && cmake --install compiler-rt-build
mkdir -p "${SDK}/lib/clang/${CLANG_VERSION}/lib/wasm64-unknown-wasip1"
cp "${RESOURCE_DIR}/lib/wasm64-unknown-wasip1/libclang_rt.builtins.a" "${SDK}/lib/clang/${CLANG_VERSION}/lib/wasm64-unknown-wasip1/"

FLAGS="--target=wasm64-wasip1 --sysroot ${SYSROOT} -fwasm-exceptions"
cmake -G Ninja -S llvm-project/runtimes -B runtimes-build "${COMMON[@]}" \
  -DCMAKE_INSTALL_INCLUDEDIR="${SYSROOT}/include/wasm64-wasip1" -DCMAKE_STAGING_PREFIX="${SYSROOT}" \
  -DCMAKE_POSITION_INDEPENDENT_CODE=OFF -DLLVM_COMPILER_CHECKED=ON -DUNIX:BOOL=ON \
  -DLIBCXX_ENABLE_THREADS=ON -DLIBCXX_HAS_PTHREAD_API=ON -DLIBCXX_HAS_EXTERNAL_THREAD_API=OFF \
  -DLIBCXX_HAS_WIN32_THREAD_API=OFF -DLIBCXX_ENABLE_SHARED=OFF -DLIBCXX_ENABLE_EXCEPTIONS=ON \
  -DLIBCXX_ENABLE_FILESYSTEM=ON -DLIBCXX_ENABLE_ABI_LINKER_SCRIPT=OFF -DLIBCXX_CXX_ABI=libcxxabi \
  -DLIBCXX_HAS_MUSL_LIBC=ON -DLIBCXX_ABI_VERSION=2 \
  -DLIBCXXABI_ENABLE_EXCEPTIONS=ON -DLIBCXXABI_ENABLE_SHARED=OFF -DLIBCXXABI_SILENT_TERMINATE=ON \
  -DLIBCXXABI_ENABLE_THREADS=ON -DLIBCXXABI_HAS_PTHREAD_API=ON -DLIBCXXABI_HAS_EXTERNAL_THREAD_API=OFF \
  -DLIBCXXABI_HAS_WIN32_THREAD_API=OFF -DLIBCXXABI_USE_LLVM_UNWINDER=ON \
  -DLIBUNWIND_ENABLE_SHARED=OFF -DLIBUNWIND_ENABLE_THREADS=ON -DLIBUNWIND_USE_COMPILER_RT=ON \
  -DLIBUNWIND_INCLUDE_TESTS=OFF -DLIBCXX_INCLUDE_TESTS=OFF -DLIBCXX_INCLUDE_BENCHMARKS=OFF \
  -DCMAKE_C_FLAGS="${FLAGS}" -DCMAKE_ASM_FLAGS="${FLAGS}" -DCMAKE_CXX_FLAGS="${FLAGS}" \
  -DLIBCXX_LIBDIR_SUFFIX=/wasm64-wasip1/eh -DLIBCXXABI_LIBDIR_SUFFIX=/wasm64-wasip1/eh \
  -DLIBUNWIND_LIBDIR_SUFFIX=/wasm64-wasip1/eh -DLLVM_ENABLE_RUNTIMES="libunwind;libcxxabi;libcxx"
cmake --build runtimes-build && cmake --install runtimes-build
ls "${SYSROOT}/lib/wasm64-wasip1/eh"
