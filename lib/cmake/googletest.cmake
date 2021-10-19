include(ExternalProject)

# Build gtest
ExternalProject_Add(
  gtest_ep
  SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/googletest"
  PREFIX "${CMAKE_BINARY_DIR}/third_party/googletest"
  INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/googletest/install"
  CMAKE_ARGS -G${CMAKE_GENERATOR}
             -DBUILD_GMOCK=On
             -DCMAKE_CXX_STANDARD=17
             -DCMAKE_CXX_FLAGS=-std=c++17
             -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
             -DCMAKE_CXX_COMPILER_LAUNCHER=${CMAKE_CXX_COMPILER_LAUNCHER}
             -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
             -DCMAKE_C_COMPILER_LAUNCHER=${CMAKE_C_COMPILER_LAUNCHER}
             -DCMAKE_CXX_FLAGS=${CMAKE_CXX_FLAGS}
             -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
             -DCMAKE_BUILD_TYPE=Release
             -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/third_party/googletest/install
  DOWNLOAD_COMMAND ""
  UPDATE_COMMAND ""
  BUILD_BYPRODUCTS
    <BINARY_DIR>/lib/libgtest.a
    <BINARY_DIR>/lib/libgmock.a
  )

ExternalProject_Get_Property(gtest_ep install_dir)

set(GTEST_INCLUDE_DIR ${install_dir}/include)
set(GMOCK_INCLUDE_DIR ${install_dir}/include)
set(GTEST_LIBRARY_PATH ${install_dir}/lib/libgtest.a)
set(GMOCK_LIBRARY_PATH ${install_dir}/lib/libgmock.a)
file(MAKE_DIRECTORY ${install_dir}/include)

add_library(gtest STATIC IMPORTED)
add_library(gmock STATIC IMPORTED)
set_property(TARGET gtest PROPERTY IMPORTED_LOCATION ${GTEST_LIBRARY_PATH})
set_property(TARGET gmock PROPERTY IMPORTED_LOCATION ${GMOCK_LIBRARY_PATH})
set_property(
  TARGET gtest
  APPEND
  PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${GTEST_INCLUDE_DIR})
set_property(
  TARGET gmock
  APPEND
  PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${GMOCK_INCLUDE_DIR})

add_dependencies(gtest gtest_ep)
add_dependencies(gmock gtest_ep)
