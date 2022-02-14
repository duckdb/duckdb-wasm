include(ExternalProject)

# DuckDB

set(DUCKDB_BUILD_TYPE ${CMAKE_BUILD_TYPE})
if(EMSCRIPTEN)
  set(DUCKDB_BUILD_TYPE Release)
endif()

message("DUCKDB_CXX_FLAGS=${DUCKDB_CXX_FLAGS}")

ExternalProject_Add(
  duckdb_ep
  SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/duckdb"
  PREFIX "${CMAKE_BINARY_DIR}/third_party/duckdb"
  INSTALL_DIR "${CMAKE_BINARY_DIR}/third_party/duckdb/install"
  CMAKE_ARGS -G${CMAKE_GENERATOR}
             -DCMAKE_CXX_STANDARD=17
             -DCMAKE_CXX_FLAGS=${DUCKDB_CXX_FLAGS}
             -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER}
             -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER}
             -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
             -DCMAKE_MODULE_PATH=${CMAKE_MODULE_PATH}
             -DCMAKE_BUILD_TYPE=${DUCKDB_BUILD_TYPE}
             -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR>
             -DBUILD_PARQUET_EXTENSION=TRUE
             -DBUILD_FTS_EXTENSION=TRUE
             -DBUILD_SHELL=FALSE
             -DBUILD_UNITTESTS=FALSE
             -DDISABLE_BUILTIN_EXTENSIONS=TRUE
  BUILD_BYPRODUCTS
    <INSTALL_DIR>/lib/libduckdb_re2.a
    <INSTALL_DIR>/lib/libduckdb_static.a
    <INSTALL_DIR>/lib/libduckdb_fmt.a
    <INSTALL_DIR>/lib/libduckdb_hyperloglog.a
    <INSTALL_DIR>/lib/libduckdb_miniz.a
    <INSTALL_DIR>/lib/libduckdb_pg_query.a
    <INSTALL_DIR>/lib/libduckdb_utf8proc.a
    <INSTALL_DIR>/lib/libduckdb_fastpforlib.a
    <INSTALL_DIR>/lib/libparquet_extension.a
    <INSTALL_DIR>/lib/libfts_extension.a)

ExternalProject_Get_Property(duckdb_ep install_dir)
ExternalProject_Get_Property(duckdb_ep binary_dir)

set(DUCKDB_SOURCE_DIR "${CMAKE_SOURCE_DIR}/../submodules/duckdb")
set(DUCKDB_INCLUDE_DIR "${install_dir}/include")
set(DUCKDB_UTF8PROC_INCLUDE_DIR
    "${DUCKDB_SOURCE_DIR}/third_party/utf8proc/include")
set(DUCKDB_FMT_INCLUDE_DIR "${DUCKDB_SOURCE_DIR}/third_party/fmt/include")
set(DUCKDB_LIBRARY_PATH "${install_dir}/lib/libduckdb_static.a")
file(MAKE_DIRECTORY ${DUCKDB_INCLUDE_DIR})

add_library(duckdb STATIC IMPORTED)
set_property(TARGET duckdb PROPERTY IMPORTED_LOCATION ${DUCKDB_LIBRARY_PATH})

target_link_libraries(
  duckdb
  INTERFACE ${install_dir}/lib/libduckdb_re2.a
  INTERFACE ${install_dir}/lib/libduckdb_fmt.a
  INTERFACE ${install_dir}/lib/libduckdb_hyperloglog.a
  INTERFACE ${install_dir}/lib/libduckdb_miniz.a
  INTERFACE ${install_dir}/lib/libduckdb_pg_query.a
  INTERFACE ${install_dir}/lib/libduckdb_utf8proc.a
  INTERFACE ${install_dir}/lib/libduckdb_fastpforlib.a
  INTERFACE dl)

target_include_directories(
  duckdb
  INTERFACE ${DUCKDB_INCLUDE_DIR}
  INTERFACE ${DUCKDB_FMT_INCLUDE_DIR}
  INTERFACE ${DUCKDB_UTF8PROC_INCLUDE_DIR}
  INTERFACE ${DUCKDB_SOURCE_DIR}/third_party/parquet
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

add_dependencies(duckdb duckdb_ep)
add_dependencies(duckdb_fts duckdb_ep)
add_dependencies(duckdb_parquet duckdb_ep)
