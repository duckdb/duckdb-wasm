include(ExternalProject)

# Build gtest
ExternalProject_Add(
    gtest_ep
    SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/googletest/googletest"
    PREFIX "${CMAKE_BINARY_DIR}/third_party/gtest"
    CMAKE_ARGS
        -G${CMAKE_GENERATOR}
        -DCMAKE_CXX_STANDARD=17
        -DCMAKE_CXX_FLAGS=-std=c++17
        -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
        -DCMAKE_CXX_COMPILER_LAUNCHER=${CMAKE_CXX_COMPILER_LAUNCHER}
        -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
        -DCMAKE_C_COMPILER_LAUNCHER=${CMAKE_C_COMPILER_LAUNCHER}
        -DCMAKE_CXX_FLAGS=${CMAKE_CXX_FLAGS}
        -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_BUILD_TYPE=Release
    DOWNLOAD_COMMAND ""
    UPDATE_COMMAND ""
    INSTALL_COMMAND ""
    BUILD_BYPRODUCTS <BINARY_DIR>/lib/libgtest.a
)

# Build gmock
ExternalProject_Add(
    gmock_ep
    SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/googletest/googlemock"
    PREFIX "${CMAKE_BINARY_DIR}/third_party/gmock"
    CMAKE_ARGS
        -G${CMAKE_GENERATOR}
        -DCMAKE_CXX_STANDARD=17
        -DCMAKE_CXX_FLAGS=-std=c++17
        -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
        -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
        -DCMAKE_CXX_FLAGS=${CMAKE_CXX_FLAGS}
        -DCMAKE_BUILD_TYPE=Release
    DOWNLOAD_COMMAND ""
    UPDATE_COMMAND ""
    INSTALL_COMMAND ""
    BUILD_BYPRODUCTS <BINARY_DIR>/lib/libgmock.a
)

# Prepare gtest
ExternalProject_Get_Property(gtest_ep source_dir)
set(GTEST_INCLUDE_DIR ${source_dir}/include)
ExternalProject_Get_Property(gtest_ep binary_dir)
set(GTEST_LIBRARY_PATH ${binary_dir}/lib/libgtest.a)
file(MAKE_DIRECTORY ${GTEST_INCLUDE_DIR})
add_library(gtest STATIC IMPORTED)
set_property(TARGET gtest PROPERTY IMPORTED_LOCATION ${GTEST_LIBRARY_PATH})
set_property(TARGET gtest APPEND PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${GTEST_INCLUDE_DIR})

# Prepare gmock
ExternalProject_Get_Property(gmock_ep source_dir)
set(GMOCK_INCLUDE_DIR ${source_dir}/include)
ExternalProject_Get_Property(gmock_ep binary_dir)
set(GMOCK_LIBRARY_PATH ${binary_dir}/lib/libgmock.a)
file(MAKE_DIRECTORY ${GMOCK_INCLUDE_DIR})
add_library(gmock STATIC IMPORTED)
set_property(TARGET gmock PROPERTY IMPORTED_LOCATION ${GMOCK_LIBRARY_PATH})
set_property(TARGET gmock APPEND PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${GMOCK_INCLUDE_DIR})

# Dependencies
add_dependencies(gtest gtest_ep)
add_dependencies(gmock gmock_ep)
