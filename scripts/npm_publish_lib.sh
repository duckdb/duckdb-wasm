#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

cd ${PROJECT_ROOT}/packages/duckdb-wasm

# Is release?
export TAG=''
if [[ "${GITHUB_REF}" =~ ^refs/tags/v.+$ ]] ; then
	yarn version `echo ${GITHUB_REF} | sed 's|refs/tags/v||'`
else 
	# Prerelease everything else
	git describe --tags --long  
	export VERSION=`git describe --tags --abbrev=0 | tr -d "v"`
	export DEV=`git describe --tags --long | cut -f2 -d-`

	# Configure prerelease
	yarn version ${VERSION}
	yarn version prerelease --preid="dev"${DEV}
	export TAG='--tag next'
fi

echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc
echo '@duckdb:registry=https://npm.pkg.github.com' >> .npmrc
