include(ExternalProject)

# Google benchmark library
ExternalProject_Add(
    benchmark_ep
    SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/benchmark"
    PREFIX "third_party/benchmark"
    INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/benchmark/install"
    CMAKE_ARGS
        -G${CMAKE_GENERATOR}
        -DCMAKE_CXX_STANDARD=17
        -DCMAKE_CXX_FLAGS=-std=c++17
        -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
        -DCMAKE_CXX_COMPILER_LAUNCHER=${CMAKE_CXX_COMPILER_LAUNCHER}
        -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
        -DCMAKE_MODULE_PATH=${CMAKE_MODULE_PATH}
        -DCMAKE_BUILD_TYPE=Release
        -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/third_party/benchmark/install
        -DBENCHMARK_ENABLE_GTEST_TESTS=FALSE
        -DBENCHMARK_ENABLE_TESTING=FALSE
    BUILD_COMMAND ${CMAKE_MAKE_PROGRAM} benchmark
    DOWNLOAD_COMMAND ""
    UPDATE_COMMAND ""
    BUILD_BYPRODUCTS
        <INSTALL_DIR>/lib/libbenchmark.a
)

ExternalProject_Get_Property(benchmark_ep install_dir)
set(BENCHMARK_INCLUDE_DIR ${install_dir}/include)
set(BENCHMARK_LIBRARY_PATH ${install_dir}/lib/libbenchmark.a)
file(MAKE_DIRECTORY ${BENCHMARK_INCLUDE_DIR})

add_library(benchmark STATIC IMPORTED)
set_property(TARGET benchmark PROPERTY IMPORTED_LOCATION ${BENCHMARK_LIBRARY_PATH})
set_property(TARGET benchmark APPEND PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${BENCHMARK_INCLUDE_DIR})

add_dependencies(benchmark benchmark_ep)
