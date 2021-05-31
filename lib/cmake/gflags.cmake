include(ExternalProject)
find_package(Git REQUIRED)

# Get gflags
ExternalProject_Add(
  gflags_src
  SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/gflags"
  PREFIX "${CMAKE_BINARY_DIR}/third_party/gflags"
  INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/gflags/install"
  CMAKE_ARGS
    -G${CMAKE_GENERATOR}
    -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/third_party/gflags/install
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
    -DCMAKE_CXX_COMPILER_LAUNCHER=${CMAKE_CXX_COMPILER_LAUNCHER}
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_C_COMPILER_LAUNCHER=${CMAKE_C_COMPILER_LAUNCHER}
    -DCMAKE_CXX_FLAGS=${CMAKE_CXX_FLAGS}
  DOWNLOAD_COMMAND ""
  UPDATE_COMMAND ""
  BUILD_BYPRODUCTS <INSTALL_DIR>/lib/libgflags.a)

# Prepare gflags
ExternalProject_Get_Property(gflags_src install_dir)
set(GFLAGS_INCLUDE_DIR ${install_dir}/include)
set(GFLAGS_LIBRARY_PATH ${install_dir}/lib/libgflags.a)
file(MAKE_DIRECTORY ${GFLAGS_INCLUDE_DIR})
add_library(gflags STATIC IMPORTED)
set_property(TARGET gflags PROPERTY IMPORTED_LOCATION ${GFLAGS_LIBRARY_PATH})
set_property(
  TARGET gflags
  APPEND
  PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${GFLAGS_INCLUDE_DIR})

# Dependencies
add_dependencies(gflags gflags_src)
