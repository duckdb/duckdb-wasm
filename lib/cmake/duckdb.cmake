include(ExternalProject)

# DuckDB

set(DUCKDB_BUILD_TYPE ${CMAKE_BUILD_TYPE})
if(EMSCRIPTEN)
  set(DUCKDB_BUILD_TYPE Release)
endif()

set(DUCKDB_CORE_DIR "${CMAKE_SOURCE_DIR}/../submodules/duckdb")
if(DUCKDB_LOCATION)
  set(DUCKDB_CORE_DIR ${DUCKDB_LOCATION})
endif()

set(DUCKDB_CXX_FLAGS "${DUCKDB_CXX_FLAGS} -Wno-unqualified-std-cast-call -DDUCKDB_DEBUG_NO_SAFETY -DDUCKDB_FROM_DUCKDB_WASM")
message("DUCKDB_CXX_FLAGS=${DUCKDB_CXX_FLAGS}")

set(DUCKDB_EXTENSIONS "fts;json")
# Escape semicolons in DUCKDB_EXTENSIONS before passing to ExternalProject_Add
string(REPLACE ";" "$<SEMICOLON>" DUCKDB_EXTENSIONS_PACKED "${DUCKDB_EXTENSIONS}")

set(USE_WASM_THREADS FALSE)
if(DUCKDB_PLATFORM STREQUAL "wasm_threads")
  set(USE_WASM_THREADS TRUE)
endif()

ExternalProject_Add(
  duckdb_ep
  SOURCE_DIR "${DUCKDB_CORE_DIR}"
  PREFIX "${CMAKE_BINARY_DIR}/third_party/duckdb"
  INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/duckdb/install"
  CMAKE_ARGS -G${CMAKE_GENERATOR}
             -DCMAKE_CXX_STANDARD=17
             -DLOCAL_EXTENSION_REPO="../../build/extension_repository"
             -DCMAKE_CXX_FLAGS=${DUCKDB_CXX_FLAGS}
             -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
             -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
             -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
             -DCMAKE_MODULE_PATH=${CMAKE_MODULE_PATH}
             -DCMAKE_BUILD_TYPE=${DUCKDB_BUILD_TYPE}
             -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR>
             -DBUILD_EXTENSIONS=${DUCKDB_EXTENSIONS_PACKED}
             -DSKIP_EXTENSIONS=jemalloc
             -DBUILD_SHELL=FALSE
             -DBUILD_UNITTESTS=FALSE
             -DDISABLE_BUILTIN_EXTENSIONS=TRUE
             -DUSE_WASM_THREADS=${USE_WASM_THREADS}
             -DDUCKDB_EXPLICIT_PLATFORM=${DUCKDB_EXPLICIT_PLATFORM}
  BUILD_BYPRODUCTS
    <INSTALL_DIR>/lib/libduckdb_re2.a
    <INSTALL_DIR>/lib/libduckdb_static.a
    <INSTALL_DIR>/lib/libduckdb_fmt.a
    <INSTALL_DIR>/lib/libduckdb_fsst.a
    <INSTALL_DIR>/lib/libduckdb_hyperloglog.a
    <INSTALL_DIR>/lib/libduckdb_miniz.a
    <INSTALL_DIR>/lib/libduckdb_mbedtls.a
    <INSTALL_DIR>/lib/libduckdb_yyjson.a
    <INSTALL_DIR>/lib/libduckdb_pg_query.a
    <INSTALL_DIR>/lib/libduckdb_utf8proc.a
    <INSTALL_DIR>/lib/libduckdb_fastpforlib.a
    <INSTALL_DIR>/lib/libparquet_extension.a
    <INSTALL_DIR>/lib/libfts_extension.a
    <INSTALL_DIR>/lib/libjson_extension.a)

ExternalProject_Get_Property(duckdb_ep install_dir)
ExternalProject_Get_Property(duckdb_ep binary_dir)

set(DUCKDB_SOURCE_DIR "${DUCKDB_CORE_DIR}")
set(DUCKDB_INCLUDE_DIR "${install_dir}/include")
set(DUCKDB_UTF8PROC_INCLUDE_DIR
    "${DUCKDB_SOURCE_DIR}/third_party/utf8proc/include")
set(DUCKDB_RE2_INCLUDE_DIR
    "${DUCKDB_SOURCE_DIR}/third_party/re2")
set(DUCKDB_FMT_INCLUDE_DIR "${DUCKDB_SOURCE_DIR}/third_party/fmt/include")
set(DUCKDB_LIBRARY_PATH "${install_dir}/lib/libduckdb_static.a")
file(MAKE_DIRECTORY ${DUCKDB_INCLUDE_DIR})

add_library(duckdb STATIC IMPORTED)
set_property(TARGET duckdb PROPERTY IMPORTED_LOCATION ${DUCKDB_LIBRARY_PATH})

target_link_libraries(
  duckdb
  INTERFACE ${install_dir}/lib/libduckdb_re2.a
  INTERFACE ${install_dir}/lib/libduckdb_fmt.a
  INTERFACE ${install_dir}/lib/libduckdb_fsst.a
  INTERFACE ${install_dir}/lib/libduckdb_hyperloglog.a
  INTERFACE ${install_dir}/lib/libduckdb_miniz.a
  INTERFACE ${install_dir}/lib/libduckdb_mbedtls.a
  INTERFACE ${install_dir}/lib/libduckdb_yyjson.a
  INTERFACE ${install_dir}/lib/libduckdb_skiplistlib.a
  INTERFACE ${install_dir}/lib/libduckdb_pg_query.a
  INTERFACE ${install_dir}/lib/libduckdb_utf8proc.a
  INTERFACE ${install_dir}/lib/libduckdb_fastpforlib.a
  INTERFACE dl)

target_include_directories(
  duckdb
  INTERFACE ${DUCKDB_INCLUDE_DIR}
  INTERFACE ${DUCKDB_FMT_INCLUDE_DIR}
  INTERFACE ${DUCKDB_UTF8PROC_INCLUDE_DIR}
  INTERFACE ${DUCKDB_RE2_INCLUDE_DIR}
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/parquet
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/yyjson
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/snappy
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/miniz
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/thrift
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/zstd)

add_library(duckdb_fts STATIC IMPORTED)
set_property(TARGET duckdb_fts PROPERTY IMPORTED_LOCATION ${install_dir}/lib/libfts_extension.a)
target_include_directories(duckdb_fts INTERFACE ${DUCKDB_SOURCE_DIR}/extension/fts/include)

add_library(duckdb_parquet STATIC IMPORTED)
set_property(TARGET duckdb_parquet PROPERTY IMPORTED_LOCATION ${install_dir}/lib/libparquet_extension.a)
target_include_directories(duckdb_parquet INTERFACE ${DUCKDB_SOURCE_DIR}/extension/parquet/include)

add_library(duckdb_json STATIC IMPORTED)
set_property(TARGET duckdb_json PROPERTY IMPORTED_LOCATION ${install_dir}/lib/libjson_extension.a)
target_include_directories(duckdb_json INTERFACE ${DUCKDB_SOURCE_DIR}/extension/json/include)

add_dependencies(duckdb duckdb_ep)
add_dependencies(duckdb_fts duckdb_ep)
add_dependencies(duckdb_parquet duckdb_ep)
add_dependencies(duckdb_json duckdb_ep)
