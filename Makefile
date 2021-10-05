.DEFAULT_GOAL := duckdb

# ---------------------------------------------------------------------------
# Config

ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

UID=${shell id -u}
GID=${shell id -g}

LIB_SOURCE_DIR="${ROOT_DIR}/lib"
LIB_DEBUG_DIR="${ROOT_DIR}/lib/build/Debug"
LIB_RELEASE_DIR="${ROOT_DIR}/lib/build/Release"
LIB_RELWITHDEBINFO_DIR="${ROOT_DIR}/lib/build/RelWithDebInfo"
DUCKDB_WASM_DIR="${ROOT_DIR}/packages/duckdb/src/wasm"

CI_IMAGE_NAMESPACE="duckdb"
CI_IMAGE_NAME="wasm-ci"
CI_IMAGE_TAG="$(shell cat ./actions/image/TAG)"
CI_IMAGE_FULLY_QUALIFIED="${CI_IMAGE_NAMESPACE}/${CI_IMAGE_NAME}:${CI_IMAGE_TAG}"
CACHE_DIRS=${ROOT_DIR}/.ccache/ ${ROOT_DIR}/.emscripten_cache/
IN_IMAGE_MOUNTS=-v${ROOT_DIR}:${ROOT_DIR} -v${ROOT_DIR}/.emscripten_cache/:/mnt/emscripten_cache/ -v${ROOT_DIR}/.ccache/:/mnt/ccache/
IN_IMAGE_ENV=-e CCACHE_DIR=/mnt/ccache -e CCACHE_BASEDIR=${ROOT_DIR}/lib/ -e EM_CACHE=/mnt/emscripten_cache/
EXEC_ENVIRONMENT?=docker run -it --rm ${IN_IMAGE_MOUNTS} ${IN_IMAGE_ENV} "${CI_IMAGE_FULLY_QUALIFIED}"

CORES=$(shell grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)

GTEST_FILTER=*

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

.PHONY: data
data:
	${ROOT_DIR}/scripts/generate_uni.sh
	${ROOT_DIR}/scripts/generate_tpch.sh 0.01

# Compile the core in debug mode
.PHONY: lib
lib:
	mkdir -p ${LIB_DEBUG_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_DEBUG_DIR} \
		-DCMAKE_BUILD_TYPE=Debug \
		-DCMAKE_EXPORT_COMPILE_COMMANDS=1
	make -C${LIB_DEBUG_DIR} -j${CORES}

# Compile the core in release mode
.PHONY: lib_relwithdebinfo
lib_relwithdebinfo:
	mkdir -p ${LIB_RELWITHDEBINFO_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_RELWITHDEBINFO_DIR} \
		-DCMAKE_BUILD_TYPE=RelWithDebInfo
	make -C${LIB_RELWITHDEBINFO_DIR} -j${CORES}

# Compile the core in release mode
.PHONY: lib_release
lib_release:
	mkdir -p ${LIB_RELEASE_DIR}
	cmake -S ${LIB_SOURCE_DIR} -B ${LIB_RELEASE_DIR} \
		-DCMAKE_BUILD_TYPE=Release
	make -C${LIB_RELEASE_DIR} -j${CORES}

# Perf the library
.PHONY: lib_perf
lib_perf: lib_relwithdebinfo
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

# Run the node benchmark
.PHONY: bench_node
bench_node:
	yarn workspace @duckdb/benchmarks build:node
	yarn workspace @duckdb/benchmarks bench:node

# Make sure we can access the wasm caches
.PHONY: wasm_caches
wasm_caches:
	mkdir -p ${ROOT_DIR}/.ccache ${ROOT_DIR}/.emscripten_cache
	chown -R $(id -u):$(id -g) ${ROOT_DIR}/.ccache ${ROOT_DIR}/.emscripten_cache

# Build the wasm module with debug info
.PHONY: wasm
wasm: wasm_caches
	mkdir -p ${CACHE_DIRS}
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh fast default
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh fast next
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh fast next_coi

# Build the wasm modules with all debug info
.PHONY: wasm_debug
wasm_debug: wasm_caches
	mkdir -p ${CACHE_DIRS}
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh debug

# Build the wasm modules
.PHONY: wasm_release
wasm_release: wasm_caches
	mkdir -p ${CACHE_DIRS}
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh release default
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh release next
	${EXEC_ENVIRONMENT} ${ROOT_DIR}/scripts/wasm_build_lib.sh release next_coi

# Build the duckdb library in debug mode
.PHONY: js_debug
js_debug:
	yarn workspace @duckdb/duckdb-wasm build:debug

# Build the duckdb library in release mode
.PHONY: js_release
js_release:
	yarn workspace @duckdb/duckdb-wasm build:release

# Build the duckdb docs
.PHONY: docs
docs:
	yarn workspace @duckdb/duckdb-wasm docs

# Run the duckdb javascript tests
.PHONY: js_tests
js_tests: js_debug
	yarn workspace @duckdb/duckdb-wasm test

# Run the duckdb javascript tests in browser
.PHONY: js_tests_browser
js_tests_browser: js_debug
	yarn workspace @duckdb/duckdb-wasm test:chrome

# Run the duckdb javascript tests in browser
.PHONY: js_tests_debug
js_tests_debug: js_debug
	yarn workspace @duckdb/duckdb-wasm test:debug

# Run the duckdb javascript tests on nodejs
.PHONY: js_tests_node
js_tests_node: js_debug
	yarn workspace @duckdb/duckdb-wasm test:node

# Run the duckdb javascript tests on nodejs
.PHONY: js_tests_node_filter
js_tests_node_filter:
	yarn workspace @duckdb/duckdb-wasm test:node:filter

# Start the shell dev server
.PHONY: shell_start
shell_start:
	yarn workspace @duckdb/duckdb-wasm-shell start

# Start the shell dev server with cross origin resource policies
.PHONY: shell_start_corp
shell_start_corp:
	yarn workspace @duckdb/duckdb-wasm-shell start:corp

# Build the shell
.PHONY: shell
shell:
	yarn workspace @duckdb/duckdb-wasm-shell build:release

# Build the shell tests
.PHONY: shell_tests
shell_tests:
	yarn workspace @duckdb/duckdb-wasm-shell build:tests

# Build pages
.PHONY: pages
pages:
	${ROOT_DIR}/scripts/build_pages.sh

# Run a local pages server for tests
.PHONY: pages_server
pages_server:
	python3 -m http.server 9003 --bind 127.0.0.1 --directory .pages

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

# Install all yarn packages
.PHONY: yarn_install
yarn_install:
	yarn

# ---------------------------------------------------------------------------
# Environment

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
	git clean -xfd
	git submodule foreach --recursive git clean -xfd
	git submodule update --init --recursive

# Build the docker dev image
.PHONY: docker_ci_image
docker_ci_image:
	tar -cvf - ./actions/image/Dockerfile | docker build \
		--platform linux/amd64 \
		-t ${CI_IMAGE_FULLY_QUALIFIED} \
		-f ./actions/image/Dockerfile \
		--build-arg UID=${UID} \
		--build-arg GID=${GID} \
		-

# Build infrastructure and packages required for development
.PHONY: bootstrap
bootstrap:
	git submodule update --init --recursive
	make docker_ci_image yarn_install
	make wasm
	make duckdb
