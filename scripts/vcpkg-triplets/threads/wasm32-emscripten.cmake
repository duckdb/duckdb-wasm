include("${CMAKE_CURRENT_LIST_DIR}/../base/wasm32-emscripten.cmake")

set(VCPKG_C_FLAGS "${VCPKG_C_FLAGS} -pthread")
set(VCPKG_CXX_FLAGS "${VCPKG_CXX_FLAGS} -pthread")
set(VCPKG_LINKER_FLAGS "${VCPKG_LINKER_FLAGS} -pthread")
