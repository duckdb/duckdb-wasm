.DEFAULT_GOAL := app

# ---------------------------------------------------------------------------
# Config

ROOT_DIR:=.

UID=${shell id -u}
GID=${shell id -g}

LIB_SOURCE_DIR="${ROOT_DIR}/lib"
LIB_DEBUG_DIR="${ROOT_DIR}/build/Debug"
LIB_RELEASE_DIR="${ROOT_DIR}/build/Release"
LIB_RELWITHDEBINFO_DIR="${ROOT_DIR}/build/RelWithDebInfo"
LIB_XRAY_DIR="${ROOT_DIR}/build/Xray"
DUCKDB_WASM_DIR="${ROOT_DIR}/packages/duckdb/src/wasm"

CACHE_DIRS=${ROOT_DIR}/.ccache/ ${ROOT_DIR}/.emscripten_cache/
DOCKER_EXEC_ENVIRONMENT=docker compose run duckdb-wasm-ci

CORES=$(shell grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)

GTEST_FILTER=*
JS_FILTER=

EXTENSION_CACHE_DIR="${ROOT_DIR}/.ccache/extension"
EXCEL_EXTENSION_CACHE_FILE="${EXTENSION_CACHE_DIR}/excel"
JSON_EXTENSION_CACHE_FILE="${EXTENSION_CACHE_DIR}/json"

cpp_lib: lib_tests

# ---------------------------------------------------------------------------
# Formatting

# Format all source files
.PHONY: format
format:
	${ROOT_DIR}/scripts/format.sh

.PHONY: check_format
check_format:
	${ROOT_DIR}/scripts/format.sh check

# ---------------------------------------------------------------------------
# Building
.PHONY: set_environment
set_environment:
	command -v emcc &> /dev/null && EXEC_ENVIRONMENT="" && echo '\033[1m=== Using native mode ===\033[0m' && echo 'Emscripten from' && which emcc || (EXEC_ENVIRONMENT=echo ${DOCKER_EXEC_ENVIRONMENT} && echo '\033[1m === Using docker environment === \033[0m')

build/data: build/duckdb_shell
	${ROOT_DIR}/scripts/generate_uni.sh
	${ROOT_DIR}/scripts/generate_tpch_tbl.sh 0.01
	${ROOT_DIR}/scripts/generate_tpch_tbl.sh 0.1
	${ROOT_DIR}/scripts/generate_tpch_tbl.sh 0.25
	${ROOT_DIR}/scripts/generate_tpch_tbl.sh 0.5
	${ROOT_DIR}/scripts/generate_tpch_arrow.sh 0.01
	${ROOT_DIR}/scripts/generate_tpch_arrow.sh 0.1
	${ROOT_DIR}/scripts/generate_tpch_arrow.sh 0.25
	${ROOT_DIR}/scripts/generate_tpch_arrow.sh 0.5
	${ROOT_DIR}/scripts/generate_tpch_sqlite.sh 0.01
	${ROOT_DIR}/scripts/generate_tpch_sqlite.sh 0.1
	${ROOT_DIR}/scripts/generate_tpch_sqlite.sh 0.25
	${ROOT_DIR}/scripts/generate_tpch_sqlite.sh 0.5
	${ROOT_DIR}/scripts/generate_tpch_duckdb.sh 0.01
	${ROOT_DIR}/scripts/generate_tpch_duckdb.sh 0.1
	${ROOT_DIR}/scripts/generate_tpch_duckdb.sh 0.25
	${ROOT_DIR}/scripts/generate_tpch_duckdb.sh 0.5
	touch build/data

# Compile the core in debug mode
.PHONY: lib
lib: submodules
	mkdir -p ${LIB_DEBUG_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_DEBUG_DIR} \
		-DCMAKE_BUILD_TYPE=Debug \
		-DCMAKE_EXPORT_COMPILE_COMMANDS=1
	make -C${LIB_DEBUG_DIR} -j${CORES}

# Compile the core in release mode with debug symbols
.PHONY: lib_relwithdebinfo
lib_relwithdebinfo: submodules
	mkdir -p ${LIB_RELWITHDEBINFO_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_RELWITHDEBINFO_DIR} \
		-DCMAKE_BUILD_TYPE=RelWithDebInfo
	make -C${LIB_RELWITHDEBINFO_DIR} -j${CORES}

DUCKDB_SOURCES := $(wildcard ${ROOT_DIR}/submodules/duckdb/src/*)

# Compile the core in release mode with debug symbols
# XXX Compiling gtest with a recent clang fails at the moment, recheck xray on linux when fixed
.PHONY: lib_xray
lib_xray: submodules
	mkdir -p ${LIB_XRAY_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_XRAY_DIR} \
		-DWITH_XRAY=1 \
		-DCMAKE_BUILD_TYPE=RelWithDebInfo
	make -C${LIB_XRAY_DIR} -j${CORES}

# Compile the core in release mode
.PHONY: lib_release
lib_release: submodules
	mkdir -p ${LIB_RELEASE_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_RELEASE_DIR} \
		-DCMAKE_BUILD_TYPE=Release
	make -C${LIB_RELEASE_DIR} -j${CORES}

# Instrument execution traces with xray
.PHONY: xray_tester
xray_tester: lib_xray
	rm ${LIB_XRAY_DIR}/xray-log.tester.*
	cd ${LIB_XRAY_DIR} && XRAY_OPTIONS="patch_premain=true xray_mode=xray-basic" ${LIB_XRAY_DIR}/tester --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}
	llvm-xray-12 convert -symbolize ${LIB_XRAY_DIR}/xray-log.tester.* -instr_map ${LIB_XRAY_DIR}/tester -output-format=trace_event | gzip -9 > ${LIB_XRAY_DIR}/xray-log.tester.gz

# Perf the library with linux perf
.PHONY: lib_perf
perf_tester: lib_relwithdebinfo
	perf record --call-graph dwarf ${LIB_RELWITHDEBINFO_DIR}/tester --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}
	hotspot ./perf.data

# Test the core library
.PHONY: lib_tests
lib_tests: lib
	${LIB_DEBUG_DIR}/tester --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}

# Debug the core library
.PHONY: lib_tests_lldb
lib_tests_lldb: lib
	lldb ${LIB_DEBUG_DIR}/tester -- --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}

# Debug the core library
.PHONY: lib_tests_gdb
lib_tests_gdb: lib
	gdb --args ${LIB_DEBUG_DIR}/tester --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}

# Test the core library
.PHONY: lib_tests_rel
lib_tests_rel: lib_relwithdebinfo
	${LIB_RELWITHDEBINFO_DIR}/tester --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}

# Test the core library
.PHONY: lib_tests_rel_lldb
lib_tests_rel_lldb: lib_relwithdebinfo
	lldb ${LIB_RELWITHDEBINFO_DIR}/tester -- --source_dir ${LIB_SOURCE_DIR} --gtest_filter=${GTEST_FILTER}

# Debug the library
.PHONY: lib_debug
lib_debug: lib
	lldb --args ${LIB_DEBUG_DIR}/tester ${LIB_SOURCE_DIR}

bench_build: yarn_install
	yarn workspace @duckdb/benchmarks build
	touch build/bench_build


.PHONY: bench_tpch_aq
bench_tpch_aq: build/data bench_build yarn_install
	yarn workspace @duckdb/benchmarks bench:system:tpch:arquero 0.01
	yarn workspace @duckdb/benchmarks bench:system:tpch:arquero 0.1
	yarn workspace @duckdb/benchmarks bench:system:tpch:arquero 0.5

# Run all benchmarks for the paper
.PHONY: bench_tpch
bench_tpch_paper: build/data bench_build yarn_install
	yarn workspace @duckdb/benchmarks build
	yarn workspace @duckdb/benchmarks bench:system:tpch:lovefield 0.01
	yarn workspace @duckdb/benchmarks bench:system:tpch:lovefield 0.1
	yarn workspace @duckdb/benchmarks bench:system:tpch:lovefield 0.5
	yarn workspace @duckdb/benchmarks bench:system:tpch:arquero 0.01
	yarn workspace @duckdb/benchmarks bench:system:tpch:arquero 0.1
	yarn workspace @duckdb/benchmarks bench:system:tpch:arquero 0.5
	yarn workspace @duckdb/benchmarks bench:system:tpch:sqljs 0.01
	yarn workspace @duckdb/benchmarks bench:system:tpch:sqljs 0.1
	yarn workspace @duckdb/benchmarks bench:system:tpch:sqljs 0.5
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.01
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.1
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.5

.PHONY: bench_all
bench_all: bench_build bench_internal bench_system_sort_int bench_system_sum_csv bench_system_sort_int bench_system_regex bench_system_join_2 bench_system_join_3 build/data
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.1
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.25
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.5

.PHONY: bench_internal
bench_internal: bench_build
	yarn workspace @duckdb/benchmarks bench:internal

.PHONY: bench_system_sort_int
bench_system_sort_int: bench_build
	yarn workspace @duckdb/benchmarks bench:system:sort:int

.PHONY: bench_system_sum_csv
bench_system_sum_csv: bench_build
	yarn workspace @duckdb/benchmarks bench:system:sum:csv

.PHONY: bench_system_sum_int
bench_system_sum_int: bench_build
	yarn workspace @duckdb/benchmarks bench:system:sum:int

.PHONY: bench_system_regex
bench_system_regex: bench_build
	yarn workspace @duckdb/benchmarks bench:system:regex

.PHONY: bench_system_join_2
bench_system_join_2: bench_build
	yarn workspace @duckdb/benchmarks bench:system:join:2

.PHONY: bench_system_join_3
bench_system_join_3: bench_build
	yarn workspace @duckdb/benchmarks bench:system:join:3

.PHONY: bench_system_tpch
bench_system_tpch_duckdb: bench_build build/data
	yarn workspace @duckdb/benchmarks bench:system:tpch:duckdb 0.1


.PHONY: wasm_caches
wasm_caches: $(DUCKDB_SOURCES)
	mkdir -p ${ROOT_DIR}/.ccache ${ROOT_DIR}/.emscripten_cache
	chown -R $(id -u):$(id -g) ${ROOT_DIR}/.ccache ${ROOT_DIR}/.emscripten_cache
	rm -rf ${EXTENSION_CACHE_DIR}
	mkdir -p ${EXTENSION_CACHE_DIR}
	chown -R $(id -u):$(id -g) ${EXTENSION_CACHE_DIR}
	mkdir -p ${CACHE_DIRS}
ifeq (${DUCKDB_EXCEL}, 1)
	touch ${EXCEL_EXTENSION_CACHE_FILE}
endif
ifeq (${DUCKDB_JSON}, 1)
	touch ${JSON_EXTENSION_CACHE_FILE}
endif

wrapped_wasm_caches:
	${EXEC_ENVIRONMENT} make wasm_caches
	mkdir -p build
	touch build/wrapped_wasm_caches

check_duckdb: $(DUCKDB_SOURCES)
	(cd ${ROOT_DIR}/build/dev/mvp && make clean) || true
	(cd ${ROOT_DIR}/build/dev/eh && make clean) || true
	(cd ${ROOT_DIR}/build/dev/coi && make clean) || true
	(cd ${ROOT_DIR}/build/relsize/mvp && make clean) || true
	(cd ${ROOT_DIR}/build/relsize/eh && make clean) || true
	(cd ${ROOT_DIR}/build/relsize/coi && make clean) || true
	(cd ${ROOT_DIR}/build/relperf/mvp && make clean) || true
	(cd ${ROOT_DIR}/build/relperf/eh && make clean) || true
	(cd ${ROOT_DIR}/build/relperf/coi && make clean) || true
	(cd ${ROOT_DIR}/build/debug/mvp && make clean) || true
	(cd ${ROOT_DIR}/build/debug/eh && make clean) || true
	(cd ${ROOT_DIR}/build/debug/coi && make clean) || true
	touch check_duckdb

wasm_setup: set_environment check_duckdb wrapped_wasm_caches
	touch wasm_setup

.PHONY: wasm_dev
wasm_dev: wasm_setup
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh dev mvp
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh dev eh
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh dev coi

.PHONY: wasm_relperf
wasm_relperf: wasm_setup
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh relperf mvp
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh relperf eh
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh relperf coi

.PHONY: wasm_relsize
wasm_relsize: wasm_setup
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh relsize mvp
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh relsize eh
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh relsize coi

.PHONY: wasm_debug
wasm_debug: wasm_setup
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh debug mvp
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh debug eh
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh debug coi

wasm: wasm_relperf

.PHONY: wasm_star
wasm_star: wasm_relsize wasm_relperf wasm_dev wasm_debug

# Build the duckdb library in debug mode
.PHONY: js_debug
js_debug: build/bootstrap wasm yarn_install
	yarn workspace @duckdb/duckdb-wasm build:debug

# Build the duckdb library in release mode
.PHONY: js_release
js_release: yarn_install
	yarn workspace @duckdb/duckdb-wasm build:release

# Build the duckdb docs
.PHONY: docs
docs: yarn_install
	yarn workspace @duckdb/duckdb-wasm docs

# Run the duckdb javascript tests
.PHONY: js_tests
js_tests: js_debug build/data
ifeq (${DUCKDB_WASM_LOADABLE_EXTENSIONS}, 1)
	# FIXME: build also for node and restore those tests
	yarn workspace @duckdb/duckdb-wasm test:chrome || echo "--- Parquet tests expected to fail!"
else
	yarn workspace @duckdb/duckdb-wasm test
endif

.PHONY: js_tests_release
js_tests_release: js_release
ifeq (${DUCKDB_WASM_LOADABLE_EXTENSIONS}, 1)
	# FIXME: build also for node and restore those tests
	yarn workspace @duckdb/duckdb-wasm test:chrome || echo "--- Parquet tests expected to fail!"
else
	yarn workspace @duckdb/duckdb-wasm test
endif

# Run the duckdb javascript tests in browser
.PHONY: js_tests_browser
js_tests_browser: js_debug build/data
	yarn workspace @duckdb/duckdb-wasm test:chrome

# Run the duckdb javascript tests in browser
.PHONY: js_tests_browser_debug
js_tests_browser_debug: js_debug build/data
	yarn workspace @duckdb/duckdb-wasm test:browser:debug

# Run the duckdb javascript tests on nodejs
.PHONY: js_tests_node
js_tests_node: js_debug build/data
	yarn workspace @duckdb/duckdb-wasm test:node --filter=${JS_FILTER}

.PHONY: js_tests_node_debug
js_tests_node_debug: js_debug build/data
	yarn workspace @duckdb/duckdb-wasm test:node:debug --filter=${JS_FILTER}

wasmpack: yarn_install
	yarn workspace @duckdb/duckdb-wasm-shell install:wasmpack

.PHONY: shell
shell: build/bootstrap js_debug
	yarn workspace @duckdb/duckdb-wasm-shell build:debug

.PHONY: shell_release
shell_release: js_release
	yarn workspace @duckdb/duckdb-wasm-shell build:release

.PHONY: app_start
app_start: yarn_install
	yarn workspace @duckdb/duckdb-wasm-app start

.PHONY: app_start_corp
app_start_corp:
	yarn workspace @duckdb/duckdb-wasm-app start:corp

.PHONY: app
app: wasm wasmpack shell docs js_tests_release
	yarn workspace @duckdb/duckdb-wasm-app build:release

.PHONY: app_server
app_server:
	python3 -m http.server 9003 --bind 127.0.0.1 --directory ./packages/duckdb-wasm-app/build/release/

# C++ formatting
.PHONY: clang_format
clang_format:
	python3 ./scripts/run_clang_format.py \
	--exclude ./lib/build \
	--exclude ./lib/third_party \
	-r ./lib/

# JS formatting
.PHONY: eslint
eslint:
	yarn workspace @duckdb/duckdb-wasm run lint
	yarn workspace @duckdb/duckdb-wasm-shell run lint
	yarn workspace @duckdb/benchmarks run lint

# Install all yarn packages
.PHONY: yarn_install
yarn_install:
	yarn
	yarn install

.PHONY: examples
examples: yarn_install
	yarn workspace @duckdb/duckdb-wasm-examples-bare-node test
	yarn workspace @duckdb/duckdb-wasm-examples-bare-browser build
	yarn workspace @duckdb/duckdb-wasm-examples-esbuild-node build
	yarn workspace @duckdb/duckdb-wasm-examples-esbuild-node test
	yarn workspace @duckdb/duckdb-wasm-examples-esbuild-browser build

# ---------------------------------------------------------------------------
# Environment

build/duckdb_shell:
	${ROOT_DIR}/scripts/build_duckdb_shell.sh

# Generate the compile commands for the language server
.PHONY: compile_commands
compile_commands:
	mkdir -p ${LIB_DEBUG_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_DEBUG_DIR} \
		-DCMAKE_BUILD_TYPE=Debug \
		-DCMAKE_EXPORT_COMPILE_COMMANDS=1
	ln -sf ${LIB_DEBUG_DIR}/compile_commands.json ${LIB_SOURCE_DIR}/compile_commands.json

# Clean the repository
.PHONY: clean
clean:
	rm -rf build
	cd packages/duckdb-wasm-shell && rm -rf node_modules
	rm -rf packages/duckdb-wasm-app/build

build/docker_ci_image:
	command -v emcc &> /dev/null || docker compose build
	touch build/docker_ci_image

submodules:
	git submodule update --init --recursive
	touch submodules

# Build infrastructure and packages required for development
build/bootstrap: submodules yarn_install
	touch build/bootstrap
