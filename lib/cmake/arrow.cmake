include(ExternalProject)

set(ARROW_CXX_FLAGS "${CMAKE_CXX_FLAGS}")

set(ARROW_FLAGS
    -G${CMAKE_GENERATOR}
    -DCMAKE_BUILD_TYPE=Release
    -DCMAKE_BUILD_PARALLEL_LEVEL=${NPROCS}
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
    -DCMAKE_CXX_COMPILER_LAUNCHER=${CMAKE_CXX_COMPILER_LAUNCHER}
    -DCMAKE_CXX_FLAGS=${ARROW_CXX_FLAGS}
    -DCMAKE_CXX_STANDARD=17
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
    -DCMAKE_C_COMPILER_LAUNCHER=${CMAKE_C_COMPILER_LAUNCHER}
    -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/third_party/arrow/install
    -DCMAKE_MODULE_PATH=${CMAKE_MODULE_PATH}
    -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
    -DARROW_ALTIVEC=OFF
    -DARROW_BOOST_USE_SHARED=OFF
    -DARROW_BUILD_SHARED=OFF
    -DARROW_BUILD_STATIC=ON
    -DARROW_BUILD_UTILITIES=OFF
    -DARROW_COMPUTE=OFF
    -DARROW_CSV=OFF
    -DARROW_DATASET=OFF
    -DARROW_DEPENDENCY_USE_SHARED=OFF
    -DARROW_FLIGHT=OFF
    -DARROW_GFLAGS_USE_SHARED=OFF
    -DARROW_HDFS=OFF
    -DARROW_IPC=ON
    -DARROW_JEMALLOC=OFF
    -DARROW_JSON=OFF
    -DARROW_OPTIONAL_INSTALL=ON
    -DARROW_ORC=OFF
    -DARROW_PARQUET=OFF
    -DARROW_PROTOBUF_USE_SHARED=OFF
    -DARROW_RUNTIME_SIMD_LEVEL=NONE
    -DARROW_SIMD_LEVEL=NONE
    -DARROW_USE_CCACHE=OFF
    -DARROW_USE_GLOG=OFF
    -DARROW_WITH_BROTLI=OFF
    -DARROW_WITH_LZ4=OFF
    -DARROW_WITH_PROTOBUF=OFF
    -DARROW_WITH_RAPIDJSON=OFF
    -DARROW_WITH_SNAPPY=OFF
    -DARROW_WITH_ZLIB=OFF
    -DARROW_WITH_ZSTD=OFF
    -DARROW_ENABLE_TIMING_TESTS=OFF
    -DBOOST_SOURCE=BUNDLED)

ExternalProject_Add(
  arrow_ep
  PREFIX "${CMAKE_BINARY_DIR}/third_party/arrow"
  SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/arrow/cpp"
  INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/arrow/install"
  CONFIGURE_COMMAND
    # This is a hacky, yet non-invasive, way to get rid of the
    # -fcolor-diagnostics flag in arrow/cpp/cmake_modules/SetupCxxFlags.cmake.
    # Ccache bails out of caching when this flag is set.
    #
    # To reproduce:
    #   Compile arrow_objlib with
    #   CCACHE_DEBUG=1
    #   CCACHE_LOGFILE=./ccache.log
    #
    # Search in the log for:
    #   Failed; falling back to running the real compiler
    #   Result: unsupported compiler option
    #
    # https://github.com/apache/arrow/issues/11279
  COMMAND
    ${CMAKE_COMMAND} -E copy <SOURCE_DIR>/cmake_modules/SetupCxxFlags.cmake
    <SOURCE_DIR>/cmake_modules/SetupCxxFlags.cmake.bak
  COMMAND
    sed s/-fcolor-diagnostics//g
    <SOURCE_DIR>/cmake_modules/SetupCxxFlags.cmake.bak >
    <SOURCE_DIR>/cmake_modules/SetupCxxFlags.cmake
  # Configure as usual
  COMMAND ${CMAKE_COMMAND} -S<SOURCE_DIR> -B<BINARY_DIR>
          -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR> ${ARROW_FLAGS}
  DOWNLOAD_COMMAND ""
  UPDATE_COMMAND ""
  BUILD_BYPRODUCTS <INSTALL_DIR>/lib/libarrow.a)

ExternalProject_Get_Property(arrow_ep install_dir)
set(ARROW_INCLUDE_DIR ${install_dir}/include)
set(ARROW_LIBRARY_PATH ${install_dir}/lib/libarrow.a)
file(MAKE_DIRECTORY ${ARROW_INCLUDE_DIR})

add_library(arrow STATIC IMPORTED)
set_property(TARGET arrow PROPERTY IMPORTED_LOCATION ${ARROW_LIBRARY_PATH})
set_property(
  TARGET arrow
  APPEND
  PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${ARROW_INCLUDE_DIR})

add_dependencies(arrow arrow_ep)
