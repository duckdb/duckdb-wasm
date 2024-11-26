# Use project versions cmake --help-policy CMP0048
if(POLICY CMP0048)
  cmake_policy(SET CMP0048 NEW)
endif(POLICY CMP0048)

project(duckdb_wasm VERSION 0.1)
cmake_minimum_required(VERSION 3.10)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(ignoreMe "${DUCKDB_WASM_VERSION}")

option(DUCKDB_WASM_LOADABLE_EXTENSIONS "Build with loadable extensions" OFF)

if(DEFINED ENV{DUCKDB_WASM_LOADABLE_EXTENSIONS})
  set(DUCKDB_WASM_LOADABLE_EXTENSIONS ON)
endif()


set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -DDUCKDB_WASM=1 -DFSST_MUST_ALIGN")

if(DUCKDB_WASM_LOADABLE_EXTENSIONS)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DWASM_LOADABLE_EXTENSIONS=1 -DDUCKDB_EXTENSION_AUTOLOAD_DEFAULT=1 -fPIC")
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DDISABLE_EXTENSION_LOAD=1")
endif()

if(NOT EMSCRIPTEN)
  set(CMAKE_CXX_FLAGS_DEBUG
      "${CMAKE_CXX_FLAGS_DEBUG} -fno-omit-frame-pointer -fsanitize=address -fsanitize=undefined")
endif()

# ---------------------------------------------------------------------------
# Ccache

if(EMSCRIPTEN AND EXISTS "$ENV{EMSDK}/ccache/git-emscripten_64bit/bin")
  find_program(CCACHE_PROGRAM ccache
               HINTS $ENV{EMSDK}/ccache/git-emscripten_64bit/bin)
else()
  find_program(CCACHE_PROGRAM ccache)
endif()

if(CCACHE_PROGRAM)
  set(CMAKE_C_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")
  set(CMAKE_CXX_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")
endif()
message(STATUS "EMSDK=$ENV{EMSDK}")
message(STATUS "CCACHE_PROGRAM=${CCACHE_PROGRAM}")

# ---------------------------------------------------------------------------
# Threads

set(CMAKE_THREAD_PREFER_PTHREAD TRUE)
set(THREADS_PREFER_PTHREAD_FLAG TRUE)
find_package(Threads REQUIRED)
set(THREAD_LIBS Threads::Threads)

# ---------------------------------------------------------------------------
# XRay

# Fails under macOS
# https://reviews.llvm.org/rT2c3c4a6286d453f763c0245c6536ddd368f0db99
# https://lists.llvm.org/pipermail/llvm-dev/2020-November/146834.html
# https://github.com/llvm/llvm-test-suite/blob/main/MicroBenchmarks/XRay/ReturnReference/CMakeLists.txt
# https://github.com/llvm/llvm-test-suite/commit/8e6f9886fd739f5a297e6d95d88d3617418b3595
if (WITH_XRAY)
  set(CMAKE_C_COMPILER_LAUNCHER "")
  set(CMAKE_CXX_COMPILER_LAUNCHER "")
  set(CMAKE_C_COMPILER "clang")
  set(CMAKE_CXX_COMPILER "clang++")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fxray-instrument")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fxray-instrument")
endif ()

# ---------------------------------------------------------------------------
# Emscripten settings

# -Os shrinks the module by 600KB but slows down TPC-H by a factor of 2!
# Dedicated module?

set(DUCKDB_PLATFORM "wasm_mvp")

if(EMSCRIPTEN)
  # Release build
  if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DNDEBUG")
    # ... with min size
    if(WASM_MIN_SIZE)
      set(CMAKE_CXX_FLAGS_RELEASE "-Oz")
      set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -Oz")
    else()
      # ... with max performance
      set(CMAKE_CXX_FLAGS_RELEASE "-O3")
      set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -O3")
    endif()
  # Release build with debug symbols
  elseif(CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
    # ... with fast linking
    if(WASM_FAST_LINKING)
      set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -O0")
    endif()
  # Debug build
  elseif(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g")
    set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} \
      -sASSERTIONS=1 \
      -sSAFE_HEAP=1 \
      -g")
    # ... with fast linking
    if(WASM_FAST_LINKING)
      set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -O0")
    endif()
  endif()

  if(WITH_WASM_EXCEPTIONS)
    set(DUCKDB_PLATFORM "wasm_eh")
    set(CMAKE_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -fwasm-exceptions -DWEBDB_FAST_EXCEPTIONS=1")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sDISABLE_EXCEPTION_CATCHING=0")
  endif()

  if(WITH_WASM_SIMD)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -msimd128 -DWEBDB_SIMD=1")
  endif()

  if(WITH_WASM_BULK_MEMORY)
    set(CMAKE_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -mbulk-memory -DWEBDB_BULK_MEMORY=1")
  endif()

  if(WITH_WASM_THREADS)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=1 -DWEBDB_THREADS=1")
    set(DUCKDB_CXX_FLAGS "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=1")
    set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=4 -pthread")
    set(DUCKDB_PLATFORM "wasm_threads")
  else()
    set(CMAKE_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=0 -DDUCKDB_NO_THREADS=1")
    set(DUCKDB_CXX_FLAGS
        "${CMAKE_CXX_FLAGS} -sUSE_PTHREADS=0 -DDUCKDB_NO_THREADS=1")
    set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -sUSE_PTHREADS=0")
    set(THREAD_LIBS)
  endif()
  set(DUCKDB_CXX_FLAGS "${DUCKDB_CXX_FLAGS} -DDUCKDB_CUSTOM_PLATFORM=${DUCKDB_PLATFORM}")
else()
  set(CMAKE_CXX_FLAGS
      "${CMAKE_CXX_FLAGS} -DWEBDB_FAST_EXCEPTIONS=1 -DWEBDB_THREADS=1")
endif()

if (DUCKDB_WASM_LOADABLE_EXTENSIONS)
  set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -s MAIN_MODULE=1 -s FILESYSTEM=1 -s ENVIRONMENT='web,node,worker' -s ALLOW_TABLE_GROWTH -lembind")
else()
  set(WASM_LINK_FLAGS "${WASM_LINK_FLAGS} -s FILESYSTEM=0 -s ENVIRONMENT='web,node,worker'")
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
include("${CMAKE_SOURCE_DIR}/cmake/arrow.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/benchmark.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/gflags.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/googletest.cmake")
include("${CMAKE_SOURCE_DIR}/cmake/rapidjson.cmake")

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

include_directories("${CMAKE_SOURCE_DIR}/include" "${DUCKDB_UTF8PROC_INCLUDE_DIR}" "${DUCKDB_RE2_INCLUDE_DIR}")

# ---------------------------------------------------------------------------
# Libraries

add_library(
  duckdb_web
  ${CMAKE_SOURCE_DIR}/src/arrow_casts.cc
  ${CMAKE_SOURCE_DIR}/src/arrow_insert_options.cc
  ${CMAKE_SOURCE_DIR}/src/arrow_stream_buffer.cc
  ${CMAKE_SOURCE_DIR}/src/arrow_type_mapping.cc
  ${CMAKE_SOURCE_DIR}/src/config.cc
  ${CMAKE_SOURCE_DIR}/src/csv_insert_options.cc
  ${CMAKE_SOURCE_DIR}/src/functions/table_function_relation.cc
  ${CMAKE_SOURCE_DIR}/src/insert_options.cc
  ${CMAKE_SOURCE_DIR}/src/io/arrow_ifstream.cc
  ${CMAKE_SOURCE_DIR}/src/io/buffered_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/io/file_page_buffer.cc
  ${CMAKE_SOURCE_DIR}/src/io/file_stats.cc
  ${CMAKE_SOURCE_DIR}/src/io/glob.cc
  ${CMAKE_SOURCE_DIR}/src/io/ifstream.cc
  ${CMAKE_SOURCE_DIR}/src/io/memory_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/io/web_filesystem.cc
  ${CMAKE_SOURCE_DIR}/src/json_analyzer.cc
  ${CMAKE_SOURCE_DIR}/src/json_dataview.cc
  ${CMAKE_SOURCE_DIR}/src/json_insert_options.cc
  ${CMAKE_SOURCE_DIR}/src/json_parser.cc
  ${CMAKE_SOURCE_DIR}/src/json_table.cc
  ${CMAKE_SOURCE_DIR}/src/json_typedef.cc
  ${CMAKE_SOURCE_DIR}/src/udf.cc
  ${CMAKE_SOURCE_DIR}/src/utils/parking_lot.cc
  ${CMAKE_SOURCE_DIR}/src/utils/shared_mutex.cc
  ${CMAKE_SOURCE_DIR}/src/utils/thread.cc
  ${CMAKE_SOURCE_DIR}/src/utils/wasm_response.cc
  ${CMAKE_SOURCE_DIR}/src/webdb.cc
  ${CMAKE_SOURCE_DIR}/src/webdb_api.cc)

if (DUCKDB_WASM_LOADABLE_EXTENSIONS)
  set(EXTENSION_CACHE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../.ccache/extension")
  set(JSON_EXTENSION_CACHE_FILE "${EXTENSION_CACHE_DIR}/json")
  set(DUCKDB_WEB_JSON "")

  target_link_libraries(duckdb_web duckdb arrow rapidjson ${THREAD_LIBS})
else()
  add_library(
    duckdb_web_fts
    ${CMAKE_SOURCE_DIR}/src/extensions/fts_extension.cc)

  add_library(
    duckdb_web_parquet
    ${CMAKE_SOURCE_DIR}/src/extensions/parquet_extension.cc)

  add_library(
    duckdb_web_json
    ${CMAKE_SOURCE_DIR}/src/extensions/json_extension.cc)

  set(EXTENSION_CACHE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../.ccache/extension")
  set(JSON_EXTENSION_CACHE_FILE "${EXTENSION_CACHE_DIR}/json")

  set(DUCKDB_WEB_JSON "")
  if(EXISTS "${JSON_EXTENSION_CACHE_FILE}")
    set(DUCKDB_WEB_JSON "duckdb_web_json")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DDUCKDB_JSON_EXTENSION")
  endif()

  target_link_libraries(duckdb_web duckdb duckdb_web_fts duckdb_web_parquet ${DUCKDB_WEB_JSON} arrow rapidjson ${THREAD_LIBS})
  target_link_libraries(duckdb_web_fts duckdb duckdb_fts)
  target_link_libraries(duckdb_web_parquet duckdb duckdb_parquet)
  target_link_libraries(duckdb_web_json duckdb duckdb_json)
endif()

# ---------------------------------------------------------------------------
# Emscripten

# We need "-s WARN_ON_UNDEFINED_SYMBOLS=0" to instantiate the module with our
# own imports.
if(EMSCRIPTEN)
  add_executable(duckdb_wasm ${CMAKE_SOURCE_DIR}/src/wasm_main.cc)
  target_link_libraries(duckdb_wasm duckdb_web ${THREAD_LIBS})
  message(STATUS "WASM_LINK_FLAGS=${WASM_LINK_FLAGS}")
  set_target_properties(
    duckdb_wasm
    PROPERTIES
      LINK_FLAGS
      "${WASM_LINK_FLAGS} \
      -s ALLOW_BLOCKING_ON_MAIN_THREAD=1 \
      -s WARN_ON_UNDEFINED_SYMBOLS=0 \
      -s ALLOW_MEMORY_GROWTH=1 \
      -s MAXIMUM_MEMORY=4GB \
      -s MODULARIZE=1 \
      -s EXPORT_NAME='DuckDB' \
      -s EXPORTED_FUNCTIONS='[ \
          _main, \
          _malloc, \
          _calloc, \
          _free, \
          _duckdb_web_clear_response, \
          _duckdb_web_collect_file_stats, \
          _duckdb_web_connect, \
          _duckdb_web_copy_file_to_buffer, \
          _duckdb_web_copy_file_to_path, \
          _duckdb_web_disconnect, \
          _duckdb_web_export_file_stats, \
          _duckdb_web_fail_with, \
          _duckdb_web_flush_file, \
          _duckdb_web_flush_files, \
          _duckdb_web_fs_drop_file, \
          _duckdb_web_fs_drop_files, \
          _duckdb_web_fs_get_file_info_by_id, \
          _duckdb_web_fs_get_file_info_by_name, \
          _duckdb_web_fs_glob_add_path, \
          _duckdb_web_fs_glob_file_infos, \
          _duckdb_web_fs_register_file_buffer, \
          _duckdb_web_fs_register_file_url, \
          _duckdb_web_get_feature_flags, \
          _duckdb_web_get_global_file_info, \
          _duckdb_web_get_tablenames, \
          _duckdb_web_get_tablenames_buffer, \
          _duckdb_web_get_version, \
          _duckdb_web_insert_arrow_from_ipc_stream, \
          _duckdb_web_insert_csv_from_path, \
          _duckdb_web_insert_json_from_path, \
          _duckdb_web_open, \
          _duckdb_web_pending_query_cancel, \
          _duckdb_web_pending_query_poll, \
          _duckdb_web_pending_query_start, \
          _duckdb_web_pending_query_start_buffer, \
          _duckdb_web_prepared_close, \
          _duckdb_web_prepared_create, \
          _duckdb_web_prepared_create_buffer, \
          _duckdb_web_prepared_run, \
          _duckdb_web_prepared_send, \
          _duckdb_web_query_fetch_results, \
          _duckdb_web_query_run, \
          _duckdb_web_query_run_buffer, \
          _duckdb_web_reset, \
          _duckdb_web_tokenize, \
          _duckdb_web_tokenize_buffer, \
          _duckdb_web_udf_scalar_create \
      ]' \
      -s EXPORTED_RUNTIME_METHODS='[\"ccall\", \"stackSave\", \"stackAlloc\", \"stackRestore\"]' \
      --js-library=${CMAKE_SOURCE_DIR}/js-stubs.js")

endif()

# ---------------------------------------------------------------------------
# Tester

if(NOT EMSCRIPTEN)
  set(TEST_CC
#      ${CMAKE_SOURCE_DIR}/test/ast_test.cc
      ${CMAKE_SOURCE_DIR}/test/all_types_test.cc
      ${CMAKE_SOURCE_DIR}/test/arrow_casts_test.cc
      ${CMAKE_SOURCE_DIR}/test/bugs_test.cc
      ${CMAKE_SOURCE_DIR}/test/file_page_buffer_test.cc
      ${CMAKE_SOURCE_DIR}/test/glob_test.cc
      ${CMAKE_SOURCE_DIR}/test/ifstream_test.cc
      ${CMAKE_SOURCE_DIR}/test/insert_arrow_test.cc
      ${CMAKE_SOURCE_DIR}/test/insert_csv_test.cc
      ${CMAKE_SOURCE_DIR}/test/insert_json_test.cc
      ${CMAKE_SOURCE_DIR}/test/json_analyzer_test.cc
      ${CMAKE_SOURCE_DIR}/test/json_table_test.cc
#      ${CMAKE_SOURCE_DIR}/test/json_typedef_test.cc
      ${CMAKE_SOURCE_DIR}/test/json_dataview_test.cc
      ${CMAKE_SOURCE_DIR}/test/memory_filesystem_test.cc
      ${CMAKE_SOURCE_DIR}/test/parquet_test.cc
      ${CMAKE_SOURCE_DIR}/test/prepared_statement_test.cc
      ${CMAKE_SOURCE_DIR}/test/readahead_buffer_test.cc
      ${CMAKE_SOURCE_DIR}/test/tablenames_test.cc
      ${CMAKE_SOURCE_DIR}/test/web_filesystem_test.cc
      ${CMAKE_SOURCE_DIR}/test/webdb_test.cc
      ${CMAKE_SOURCE_DIR}/test/tester.cc)

  set(TEST_LIBS duckdb_web duckdb_web_fts duckdb_web_parquet ${DUCKDB_WEB_JSON} gtest gmock gflags ${THREAD_LIBS})

  add_executable(tester ${TEST_CC})
  target_link_libraries(tester ${TEST_LIBS})
endif()
