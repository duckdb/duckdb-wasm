# The 64-bit sandbox target: wasi-sdk's clang with a sysroot built for wasm64-wasip1 (scripts/wasm64_sysroot.sh),
# wasi-libc with its 32-bit layout checks dropped. The module speaks the same syscalls with 64-bit pointers,
# which only our hosts implement.
list(APPEND CMAKE_MODULE_PATH "${WASI_SDK_PREFIX}/share/cmake")

set(CMAKE_SYSTEM_NAME WASI)
set(CMAKE_SYSTEM_VERSION 1)
set(CMAKE_SYSTEM_PROCESSOR wasm64)
set(CMAKE_EXECUTABLE_SUFFIX .wasm)
set(triple wasm64-wasip1)

set(CMAKE_C_COMPILER ${WASI_SDK_PREFIX}/bin/clang)
set(CMAKE_CXX_COMPILER ${WASI_SDK_PREFIX}/bin/clang++)
set(CMAKE_ASM_COMPILER ${WASI_SDK_PREFIX}/bin/clang)
set(CMAKE_AR ${WASI_SDK_PREFIX}/bin/llvm-ar)
set(CMAKE_RANLIB ${WASI_SDK_PREFIX}/bin/llvm-ranlib)
set(CMAKE_C_COMPILER_TARGET ${triple})
set(CMAKE_CXX_COMPILER_TARGET ${triple})
set(CMAKE_ASM_COMPILER_TARGET ${triple})
set(CMAKE_SYSROOT ${WASM64_SYSROOT})
# clang does not look for libc++ headers under a wasm64 multiarch directory on its own
set(CMAKE_CXX_FLAGS_INIT "-isystem ${WASM64_SYSROOT}/include/wasm64-wasip1/c++/v1")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
