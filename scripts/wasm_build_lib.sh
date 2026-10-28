#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

MODE=${1:-Fast}
FEATURES=${2:-base}
DUCKDB_LOCATION=${3:-"$PROJECT_ROOT/submodules/duckdb"}
LOCAL_EXTENSIONS=()
LOCAL_SOURCES=()
for name in httpfs aws quack; do
  case "$name" in
    httpfs) source=${DUCKDB_HTTPFS_DIRECTORY:-} ;;
    aws) source=${DUCKDB_AWS_DIRECTORY:-} ;;
    quack) source=${DUCKDB_QUACK_DIRECTORY:-} ;;
  esac
  [ -n "$source" ] || continue
  for file in CMakeLists.txt extension_config.cmake; do
    if [ ! -f "${source}/${file}" ]; then
      echo "DUCKDB_$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')_DIRECTORY must contain ${file}: ${source}" >&2
      exit 1
    fi
  done
  LOCAL_EXTENSIONS+=("$name")
  LOCAL_SOURCES+=("$(cd "$source" && pwd)")
done

if [ -n "${DUCKDB_AWS_DIRECTORY:-}" ] || [ -n "${DUCKDB_QUACK_DIRECTORY:-}" ]; then
  VCPKG_TOOLCHAIN_PATH=${VCPKG_TOOLCHAIN_PATH:-${HOME}/vcpkg/scripts/buildsystems/vcpkg.cmake}
  if [ ! -f "${VCPKG_TOOLCHAIN_PATH}" ]; then
    echo "AWS or Quack dependencies require VCPKG_TOOLCHAIN_PATH pointing to vcpkg/scripts/buildsystems/vcpkg.cmake." >&2
    exit 1
  fi
  VCPKG_TOOLCHAIN_PATH="$(cd "$(dirname "${VCPKG_TOOLCHAIN_PATH}")" && pwd)/$(basename "${VCPKG_TOOLCHAIN_PATH}")"
  export EMSCRIPTEN_ROOT="$(em-config EMSCRIPTEN_ROOT)"
fi

echo "MODE=${MODE}"
echo "${DUCKDB_LOCATION}"

CPP_SOURCE_DIR="${PROJECT_ROOT}/lib"
DUCKDB_LIB_DIR="${PROJECT_ROOT}/packages/duckdb-wasm/src/bindings"

CORES=${CORES:-$(grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)}

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
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DDUCKDB_CUSTOM_PLATFORM=wasm_eh -DDUCKDB_EXPLICIT_PLATFORM=wasm_eh"
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

case ${GEN:-make} in
  ninja) GENERATOR=Ninja; BUILD_SUFFIX=-ninja ;;
  make) GENERATOR="Unix Makefiles"; BUILD_SUFFIX= ;;
  *) echo "Unknown GEN '${GEN}'; use ninja or make" >&2; exit 1 ;;
esac
BUILD_DIR="${PROJECT_ROOT}/build/${MODE}/${FEATURES}${BUILD_SUFFIX}"
mkdir -p "${BUILD_DIR}"

set -x

DUCKDB_WASM_VERSION_NAME=${DUCKDB_WASM_VERSION:-unknown}

emcmake cmake -G "${GENERATOR}" \
    -S${CPP_SOURCE_DIR} \
    -B${BUILD_DIR} \
    -DDUCKDB_WASM_VERSION=${DUCKDB_WASM_VERSION_NAME} \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DDUCKDB_LOCATION=${DUCKDB_LOCATION} \
    -DWASM_LINK_FLAGS_EXT="${LINK_FLAGS}" \
    -DDUCKDB_EXTENSION_CONFIGS=extension_config_wasm.cmake \
    ${ADDITIONAL_FLAGS}

cmake --build "${BUILD_DIR}" --parallel "${CORES}" --target duckdb_wasm

if [ "${USE_GENERATED_EXPORTED_LIST:-no}" == "yes" ]; then
make TARGET="${FEATURES}${BUILD_SUFFIX}" update_exported_list

emcmake cmake -G "${GENERATOR}" \
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

cmake --build "${BUILD_DIR}" --parallel "${CORES}" --target duckdb_wasm
fi

LOADABLE_EXTENSIONS=$(cat "${BUILD_DIR}/wasm_loadable_extensions")
if [ "${#LOCAL_EXTENSIONS[@]}" -gt 0 ] && [ "$LOADABLE_EXTENSIONS" != 1 ]; then
  echo "Local extensions require DUCKDB_WASM_LOADABLE_EXTENSIONS=1." >&2
  exit 1
fi
if [ "$LOADABLE_EXTENSIONS" = 1 ]; then
  CORE_BUILD="${BUILD_DIR}/third_party/duckdb/src/duckdb_ep-build"
  PLATFORM=$(<"${CORE_BUILD}/duckdb_platform_out")
  MAIN_FLAGS=
  MAIN_VERSION=
  while IFS= read -r line; do
    case "$line" in
      CMAKE_CXX_FLAGS:*) MAIN_FLAGS=${line#*=} ;;
      DUCKDB_EXPLICIT_VERSION:*) MAIN_VERSION=${line#*=} ;;
    esac
  done < "${CORE_BUILD}/CMakeCache.txt"
  THREADS=OFF
  [ "$FEATURES" != threads ] || THREADS=ON
  STAGE_ARGS=("${PROJECT_ROOT}/build" "$MODE" "$FEATURES" "$BUILD_SUFFIX")

  for ((i = 0; i < ${#LOCAL_EXTENSIONS[@]}; i++)); do
    name=${LOCAL_EXTENSIONS[$i]}
    source=${LOCAL_SOURCES[$i]}
    EXTENSION_BUILD="${PROJECT_ROOT}/build/local_extensions/${name}/${FEATURES}${BUILD_SUFFIX}"
    DEPENDENCY_FLAGS=(-DENABLE_JEMALLOC=OFF)
    if [ "$name" = aws ] || [ "$name" = quack ]; then
      DEPENDENCY_FLAGS+=(
        "-DCMAKE_TOOLCHAIN_FILE=${VCPKG_TOOLCHAIN_PATH}"
        "-DVCPKG_CHAINLOAD_TOOLCHAIN_FILE=${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake"
        "-DVCPKG_MANIFEST_DIR=${source}"
        "-DVCPKG_OVERLAY_TRIPLETS=${PROJECT_ROOT}/scripts/vcpkg-triplets/${FEATURES}"
        -DVCPKG_TARGET_TRIPLET=wasm32-emscripten -DVCPKG_BUILD=1
      )
    fi
    echo "Building ${name} (${PLATFORM}) from ${source}"
    emcmake cmake -G "${GENERATOR}" -S "${DUCKDB_LOCATION}" -B "${EXTENSION_BUILD}" \
      -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS="${MAIN_FLAGS}" \
      -DDUCKDB_EXTENSION_CONFIGS="${source}/extension_config.cmake" \
      -DDUCKDB_EXPLICIT_VERSION="${MAIN_VERSION}" -DDUCKDB_EXPLICIT_PLATFORM="${PLATFORM}" \
      -DWASM_LOADABLE_EXTENSIONS=ON -DUSE_WASM_THREADS="${THREADS}" \
      -DBUILD_EXTENSIONS_ONLY=ON -DBUILD_UNITTESTS=OFF -DBUILD_SHELL=OFF \
      "${DEPENDENCY_FLAGS[@]}"
    # emmake's CC/CXX environment would also cross-compile vcpkg's native host tools.
    cmake --build "${EXTENSION_BUILD}" --target "${name}_loadable_extension" --parallel "${CORES}"
    STAGE_ARGS+=("$name")
  done
  python3 "${PROJECT_ROOT}/scripts/stage_local_extensions.py" "${STAGE_ARGS[@]}"
fi

js-beautify -v || npm install -g js-beautify
js-beautify ${BUILD_DIR}/duckdb_wasm.js > ${BUILD_DIR}/beauty.js
cp ${BUILD_DIR}/beauty.js ${BUILD_DIR}/beauty2.js
awk '!(/var .*wasmExports\[/ || /var [_a-z0-9A-Z]+ = Module\[\"[_a-z0-9A-Z]+\"\] = [0-9]+;/) || /var _duckdb_web/ || /var _main/ || /var _calloc/ || /var _malloc/ || /var _free/ || /var stack/ || /var ___dl_seterr/ || /var __em/ || /var _em/ || /var _pthread/' ${BUILD_DIR}/beauty2.js > ${BUILD_DIR}/duckdb_wasm.js

# In loadable threaded builds, a thread joined by the main thread is cleaned up (and its pthread_t freed) before the
# main thread processes the exiting worker's "finished" message. That message can then land on whichever thread is
# allocated at the same address, and dlsync skips that thread as finished, so it runs extension code with an unsynced
# table. Only the worker still registered for the pthread_t may mark it finished.
if [ "$FEATURES" = "threads" ] && [ "$LOADABLE_EXTENSIONS" = "1" ]; then
python3 - "${BUILD_DIR}/duckdb_wasm.js" <<'EOF_PATCH'
import sys
path = sys.argv[1]
src = open(path).read()
needle = "markAsFinished(d.thread);"
guard = "if (PThread.pthreads[d.thread] === worker) "
patched = guard + needle
assert src.count(needle) == 1, "markAsFinished(d.thread) not found once in the emscripten glue"
# The build script can run again without relinking the generated glue.
# Collapse a previously applied guard before ensuring it is present once.
while guard + patched in src:
    src = src.replace(guard + patched, patched)
if patched not in src:
    src = src.replace(needle, patched)
open(path, "w").write(src)
EOF_PATCH
fi

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
