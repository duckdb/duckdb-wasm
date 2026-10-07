#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

MODE=${1:-Fast}
FEATURES=${2:-base}
DUCKDB_LOCATION=${3:-"$PROJECT_ROOT/submodules/duckdb"}
echo "MODE=${MODE}"
echo "${DUCKDB_LOCATION}"

CPP_SOURCE_DIR="${PROJECT_ROOT}/lib"
DUCKDB_LIB_DIR="${PROJECT_ROOT}/packages/duckdb-wasm/src/bindings"

CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)

# Extra CMake flags, e.g. -DDUCKDB_WASM_STATIC_TPCH=1 for benchmarks
ADDITIONAL_FLAGS=${EXTRA_CMAKE_FLAGS:-}
SUFFIX=
LINK_FLAGS=
case $MODE in
  "debug") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Debug -DWASM_FAST_LINKING=1 ${ADDITIONAL_FLAGS}" ;;
  "dev") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=RelWithDebInfo -DWASM_FAST_LINKING=1 ${ADDITIONAL_FLAGS}" ;;
  "relsize") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Release -DWASM_MIN_SIZE=1 ${ADDITIONAL_FLAGS}" ;;
  "relperf") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Release ${ADDITIONAL_FLAGS}" ;;
   *) ;;
esac
case $FEATURES in
  "base")
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DDUCKDB_CUSTOM_PLATFORM=wasm_base -DDUCKDB_EXPLICIT_PLATFORM=wasm_base"
    SUFFIX="-base"
    ;;
  "threads")
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DWITH_WASM_THREADS=1 -DWITH_WASM_SIMD=1 -DWITH_WASM_BULK_MEMORY=1 -DDUCKDB_CUSTOM_PLATFORM=wasm_threads -DDUCKDB_EXPLICIT_PLATFORM=wasm_threads"
    SUFFIX="-threads"
    LINK_FLAGS="-pthread -sSHARED_MEMORY=1"
    ;;
   *) echo "unknown features '${FEATURES}', expected base or threads"; exit 1 ;;
esac
# Extra link flags, e.g. EXTRA_LINK_FLAGS=-sASSERTIONS=1 for diagnostics
LINK_FLAGS="${LINK_FLAGS} ${EXTRA_LINK_FLAGS:-}"
echo "MODE=${MODE}"
echo "FEATURES=${FEATURES}"

BUILD_DIR="${PROJECT_ROOT}/build/${MODE}/${FEATURES}"
mkdir -p ${BUILD_DIR}

set -x

DUCKDB_WASM_VERSION_NAME=${DUCKDB_WASM_VERSION:-unknown}

emcmake cmake \
    -S${CPP_SOURCE_DIR} \
    -B${BUILD_DIR} \
    -DDUCKDB_WASM_VERSION=${DUCKDB_WASM_VERSION_NAME} \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DDUCKDB_LOCATION=${DUCKDB_LOCATION} \
    -DWASM_LINK_FLAGS_EXT="${LINK_FLAGS}" \
    -DDUCKDB_EXTENSION_CONFIGS=extension_config_wasm.cmake \
    ${ADDITIONAL_FLAGS}

emmake make \
    -C${BUILD_DIR} \
    -j${CORES} \
    duckdb_wasm

if [ "${USE_GENERATED_EXPORTED_LIST:-no}" == "yes" ]; then
make TARGET=${FEATURES} update_exported_list

emcmake cmake \
    -S${CPP_SOURCE_DIR} \
    -B${BUILD_DIR} \
    -DDUCKDB_WASM_VERSION=${DUCKDB_WASM_VERSION_NAME} \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DDUCKDB_LOCATION=${DUCKDB_LOCATION} \
    -DWASM_LINK_FLAGS_EXT="${LINK_FLAGS}" \
    -DDUCKDB_EXTENSION_CONFIGS=extension_config_wasm.cmake \
    -DUSE_GENERATED_EXPORTED_LIST=1 \
    ${ADDITIONAL_FLAGS}

emmake make \
    -C${BUILD_DIR} \
    -j${CORES} \
    duckdb_wasm
fi

js-beautify -v || npm install -g js-beautify
js-beautify ${BUILD_DIR}/duckdb_wasm.js > ${BUILD_DIR}/beauty.js
cp ${BUILD_DIR}/beauty.js ${BUILD_DIR}/beauty2.js
awk '!(/var .*wasmExports\[/ || /var [_a-z0-9A-Z]+ = Module\[\"[_a-z0-9A-Z]+\"\] = [0-9]+;/) || /var _duckdb_web/ || /var _main/ || /var _calloc/ || /var _malloc/ || /var _free/ || /var stack/ || /var ___dl_seterr/ || /var __em/ || /var _em/ || /var _pthread/' ${BUILD_DIR}/beauty2.js > ${BUILD_DIR}/duckdb_wasm.js

# A thread joined by the main thread is cleaned up (and its pthread_t freed) before the main thread processes the
# exiting worker's "finished" message: that message then lands on whatever thread is allocated at the same address,
# and dlsync skips the thread as finished, so it runs extension code with an unsynced table. Only the worker still
# registered for the pthread_t may mark it finished. Builds without pthreads have no such message.
python3 - ${BUILD_DIR}/duckdb_wasm.js <<'EOF_PATCH'
import sys
path = sys.argv[1]
src = open(path).read()
needle = "markAsFinished(d.thread);"
if "pthread_ptr" in src:
    assert src.count(needle) == 1, "markAsFinished(d.thread) not found once in the emscripten glue"
    src = src.replace(needle, "if (PThread.pthreads[d.thread] === worker) markAsFinished(d.thread);")
    open(path, "w").write(src)
EOF_PATCH

cp ${BUILD_DIR}/duckdb_wasm.wasm ${DUCKDB_LIB_DIR}/duckdb${SUFFIX}.wasm
sed \
  -e "s/duckdb_wasm\.wasm/.\/duckdb${SUFFIX}.wasm/g" \
  ${BUILD_DIR}/duckdb_wasm.js > ${DUCKDB_LIB_DIR}/duckdb${SUFFIX}.js

if [ -f ${BUILD_DIR}/duckdb_wasm.worker.js ]; then
  sed \
    -e "s/duckdb_wasm\.wasm/.\/duckdb${SUFFIX}.wasm/g" \
    -e "s/duckdb_wasm\.js/.\/duckdb${SUFFIX}.js/g" \
    ${BUILD_DIR}/duckdb_wasm.worker.js > ${DUCKDB_LIB_DIR}/duckdb${SUFFIX}.pthread.js

  # Expose the module.
  # This will allow us to reuse the generated pthread handler and only overwrite the loading.
  # More info: duckdb-browser-threads.pthread.worker.ts
  printf "\nexport const onmessage = self.onmessage;\nexport function getModule() { return Module; }\nexport function setModule(m) { Module = m; }\n" \
    >> ${DUCKDB_LIB_DIR}/duckdb${SUFFIX}.pthread.js
fi
