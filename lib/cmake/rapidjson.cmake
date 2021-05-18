include(ExternalProject)

# Get rapidjson
ExternalProject_Add(
    rapidjson_ep
    SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/rapidjson"
    PREFIX "third_party/rapidjson"
    INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/rapidjson/install"
    CMAKE_ARGS
        -G${CMAKE_GENERATOR}
        -DCMAKE_CXX_STANDARD=17
        -DCMAKE_CXX_FLAGS=-std=c++17
        -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
        -DCMAKE_CXX_COMPILER_LAUNCHER=${CMAKE_CXX_COMPILER_LAUNCHER}
        -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
        -DCMAKE_C_COMPILER_LAUNCHER=${CMAKE_C_COMPILER_LAUNCHER}
        -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_MODULE_PATH=${CMAKE_MODULE_PATH}
        -DCMAKE_BUILD_TYPE=Release
        -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/third_party/rapidjson/install
        -DRAPIDJSON_BUILD_DOC=FALSE
        -DRAPIDJSON_BUILD_EXAMPLES=FALSE
        -DRAPIDJSON_BUILD_TESTS=FALSE
        -DRAPIDJSON_BUILD_THIRDPARTY_GTEST=FALSE
    DOWNLOAD_COMMAND ""
    UPDATE_COMMAND ""
)

# Prepare json
ExternalProject_Get_Property(rapidjson_ep install_dir)
set(RAPIDJSON_INCLUDE_DIR ${install_dir}/include)
file(MAKE_DIRECTORY ${RAPIDJSON_INCLUDE_DIR})
add_library(rapidjson INTERFACE)
target_include_directories(rapidjson SYSTEM INTERFACE ${RAPIDJSON_INCLUDE_DIR})

# Dependencies
add_dependencies(rapidjson rapidjson_ep)

