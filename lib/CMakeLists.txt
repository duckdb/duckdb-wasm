# Use project versions cmake --help-policy CMP0048
if(POLICY CMP0048)
  cmake_policy(SET CMP0048 NEW)
endif(POLICY CMP0048)

project(dashql VERSION 0.1)
cmake_minimum_required(VERSION 3.10)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS -std=c++17)

if(NOT EMSCRIPTEN)
  set(CMAKE_CXX_FLAGS_DEBUG
      "${CMAKE_CXX_FLAGS_DEBUG} -fsanitize=address -fsanitize=undefined")
endif()

# ---------------------------------------------------------------------------
# Ccache

find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
  set(CMAKE_C_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")
  set(CMAKE_CXX_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")
endif()

# ---------------------------------------------------------------------------
# Threads

set(CMAKE_THREAD_PREFER_PTHREAD TRUE)
set(THREADS_PREFER_PTHREAD_FLAG TRUE)
find_package(Threads REQUIRED)
set(THREAD_LIBS Threads::Threads)

# ---------------------------------------------------------------------------
# Emscripten settings

if(EMSCRIPTEN)
  if(CMAKE_BUILD_TYPE MATCHES Release)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")
  endif()

  if(WITH_WASM_EXCEPTIONS)
    set(CMAKE_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -fwasm-exceptions -DWEBDB_FAST_EXCEPTIONS=1")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sDISABLE_EXCEPTION_CATCHING=0")
  endif()

  if(WITH_WASM_THREADS)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=1 -DWEBDB_THREADS=1")
    set(DUCKDB_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=1")
    set(WASM_LINK_FLAGS "-sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=4")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=0")
    set(DUCKDB_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=0 -DDUCKDB_NO_THREADS=1")
    set(WASM_LINK_FLAGS "-sUSE_PTHREADS=0")
    set(THREAD_LIBS)
  endif()
else()
  set(CMAKE_CXX_FLAGS
      "${CMAKE_CXX_FLAGS} -DWEBDB_FAST_EXCEPTIONS=1 -DWEBDB_THREADS=1")
endif()

# ---------------------------------------------------------------------------
# Parallelism

include(ProcessorCount)
ProcessorCount(NPROCS)
set(CMAKE_BUILD_PARALLEL_LEVEL ${NPROCS})

# ---------------------------------------------------------------------------
# CMake includes

set(CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/cmake/modules ${CMAKE_MODULE_PATH})

include("${CMAKE_SOURCE_DIR}/cmake/duckdb.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/boost.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/arrow.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/benchmark.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/gflags.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/googletest.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/rapidjson.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/spdlog.cmake")

# ---------------------------------------------------------------------------
# Code coverage

if(CODE_COVERAGE)
  if("${CMAKE_C_COMPILER_ID}" MATCHES "(Apple)?[Cc]lang"
     OR "${CMAKE_CXX_COMPILER_ID}" MATCHES "(Apple)?[Cc]lang")
    message("Building with llvm code coverage")
    set(CMAKE_C_FLAGS
        "${CMAKE_C_FLAGS} -fprofile-instr-generate -fcoverage-mapping")
    set(CMAKE_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -fprofile-instr-generate -fcoverage-mapping")
  elseif(CMAKE_COMPILER_IS_GNUCXX)
    message("Building with lcov code coverage")
    set(CMAKE_C_FLAGS
        "${CMAKE_C_FLAGS} --coverage -fprofile-arcs -ftest-coverage")
    set(CMAKE_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} --coverage -fprofile-arcs -ftest-coverage")
  else()
    message(FATAL_ERROR "Code coverage requires Clang or GCC. Aborting.")
  endif()
endif()

# ---------------------------------------------------------------------------
# Headers

include_directories("${CMAKE_SOURCE_DIR}/include" "${CMAKE_BINARY_DIR}/include"
                    "${DUCKDB_INCLUDE_DIR}" "${DUCKDB_UTF8PROC_INCLUDE_DIR}")

# ---------------------------------------------------------------------------
# Libraries

add_library(
  duckdb_web
  ${CMAKE_SOURCE_DIR}/src/csv_table_options.cc
  ${CMAKE_SOURCE_DIR}/src/json_analyzer.cc
  ${CMAKE_SOURCE_DIR}/src/json_parser.cc
  ${CMAKE_SOURCE_DIR}/src/json_table.cc
  ${CMAKE_SOURCE_DIR}/src/json_table_options.cc
  ${CMAKE_SOURCE_DIR}/src/json_typedef.cc
  ${CMAKE_SOURCE_DIR}/src/io/arrow_ifstream.cc
  ${CMAKE_SOURCE_DIR}/src/io/buffered_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/io/default_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/io/filesystem_buffer.cc
  ${CMAKE_SOURCE_DIR}/src/io/memory_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/io/ifstream.cc
  ${CMAKE_SOURCE_DIR}/src/io/web_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/miniz_zipper.cc
  ${CMAKE_SOURCE_DIR}/src/wasm_response.cc
  ${CMAKE_SOURCE_DIR}/src/webdb.cc
  ${CMAKE_SOURCE_DIR}/src/webdb_api.cc)

target_link_libraries(duckdb_web duckdb spdlog arrow rapidjson ${THREAD_LIBS})

# ---------------------------------------------------------------------------
# Emscripten

# We need "-s WARN_ON_UNDEFINED_SYMBOLS=0" to instantiate the module with our
# own imports.
if(EMSCRIPTEN)
  if(WASM_FAST_LINKING)
    set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -O0")
  else()
    set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -O3")
  endif()

  add_executable(duckdb_wasm ${CMAKE_SOURCE_DIR}/src/wasm_main.cc)
  target_link_libraries(duckdb_wasm duckdb_web spdlog ${THREAD_LIBS})
  set_target_properties(
    duckdb_wasm
    PROPERTIES
      LINK_FLAGS
      "${WASM_LINK_FLAGS} \
      -s ENVIRONMENT='web,node,worker' \
      -s WARN_ON_UNDEFINED_SYMBOLS=0 \
      -s ALLOW_MEMORY_GROWTH=1 \
      -s MODULARIZE=1 \
      -s FILESYSTEM=0 \
      -s EXPORT_ES6=1 \
      -s EXPORT_NAME='DuckDB' \
      -s EXPORTED_FUNCTIONS='[ \
          _main, \
          _malloc, \
          _free, \
          _duckdb_web_get_version, \
          _duckdb_web_get_feature_flags, \
          _duckdb_web_clear_response, \
          _duckdb_web_flush_files, \
          _duckdb_web_flush_file, \
          _duckdb_web_tokenize, \
          _duckdb_web_connect, \
          _duckdb_web_disconnect, \
          _duckdb_web_fs_get_file_info, \
          _duckdb_web_fs_set_file_descriptor, \
          _duckdb_web_fs_register_file_url, \
          _duckdb_web_fs_register_file_buffer, \
          _duckdb_web_fs_directory_list_files_callback, \
          _duckdb_web_fs_glob_callback, \
          _duckdb_web_query_fetch_results, \
          _duckdb_web_query_run, \
          _duckdb_web_query_send, \
          _duckdb_web_import_csv_table, \
          _duckdb_web_import_json_table, \
          _duckdb_web_zip_load_file, \
          _duckdb_web_zip_read_entry_count, \
          _duckdb_web_zip_read_entry_info, \
          _duckdb_web_zip_extract_entry_to_path, \
          _duckdb_web_zip_extract_path_to_path \
      ]' \
      -s EXPORTED_RUNTIME_METHODS='[\"ccall\"]' \
      --js-library=${CMAKE_SOURCE_DIR}/js-stubs.js")

endif()

# ---------------------------------------------------------------------------
# Tester

if(NOT EMSCRIPTEN)
  set(TEST_CC
      ${CMAKE_SOURCE_DIR}/test/filesystem_buffer_test.cc
      ${CMAKE_SOURCE_DIR}/test/ifstream_test.cc
      ${CMAKE_SOURCE_DIR}/test/import_csv_test.cc
      ${CMAKE_SOURCE_DIR}/test/import_json_test.cc
      ${CMAKE_SOURCE_DIR}/test/import_parquet_test.cc
      ${CMAKE_SOURCE_DIR}/test/json_analyzer_test.cc
      ${CMAKE_SOURCE_DIR}/test/json_table_test.cc
      ${CMAKE_SOURCE_DIR}/test/json_typedef_test.cc
      ${CMAKE_SOURCE_DIR}/test/memory_filesystem_test.cc
      ${CMAKE_SOURCE_DIR}/test/miniz_zipper_test.cc
      ${CMAKE_SOURCE_DIR}/test/webdb_test.cc
      ${CMAKE_SOURCE_DIR}/test/tester.cc)
  set(TEST_LIBS duckdb_web gtest gmock gflags ${THREAD_LIBS})

  add_executable(tester ${TEST_CC})
  target_link_libraries(tester ${TEST_LIBS})
endif()
