#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

# Prerelease everything else
git describe --tags --long  
export VERSION=`git describe --tags --abbrev=0 | tr -d "v"`
export DEV=`git describe --tags --long | cut -f2 -d-`
export TAG=''	
echo "VERSION=${VERSION}"
echo "DEV=${DEV}"

# Is release?
if [[ "${DEV}" = "0" ]] ; then
	for PKG in ${PROJECT_ROOT}/packages/* ; do
		cd ${PKG}
		npm version ${VERSION}
	done
else 
	export TAG='--tag next'	
	for PKG in ${PROJECT_ROOT}/packages/* ; do
		cd ${PKG}
		npm version ${VERSION}
		npm version prerelease --preid="dev"${DEV}
	done
fi
echo "TAG=${TAG}"

cd ${PROJECT_ROOT}
node ${PROJECT_ROOT}/scripts/sync_versions.mjs

if [[ "$1" = "publish" ]] ; then
	cd ${PROJECT_ROOT}/packages/duckdb-wasm

	npm config set //registry.npmjs.org/:_authToken ${NPM_PUBLISH_TOKEN}
	npm publish --ignore-scripts --access public ${TAG} || true
fi
