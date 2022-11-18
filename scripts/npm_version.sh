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
		yarn version ${VERSION}
	done
else 
	for PKG in ${PROJECT_ROOT}/packages/* ; do
		cd ${PKG}
		yarn version ${VERSION}
		yarn version prerelease --preid="dev"${DEV}
	done
fi
echo "TAG=${TAG}"

cd ${PROJECT_ROOT}
node ${PROJECT_ROOT}/scripts/sync_versions.mjs
