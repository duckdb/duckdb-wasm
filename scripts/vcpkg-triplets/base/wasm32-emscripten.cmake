include("${VCPKG_ROOT_DIR}/triplets/community/wasm32-emscripten.cmake")

set(VCPKG_C_FLAGS "-fPIC")
set(VCPKG_CXX_FLAGS "-fPIC -fwasm-exceptions")
set(VCPKG_LINKER_FLAGS "-fwasm-exceptions")
