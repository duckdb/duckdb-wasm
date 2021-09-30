#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

# Is release?
export TAG=''
if [[ "${GITHUB_REF}" =~ ^refs/tags/v.+$ ]] ; then
	for PKG in ${PROJECT_ROOT}/packages/* ; do
		cd ${PKG}
		npm version `echo ${GITHUB_REF} | sed 's|refs/tags/v||'`
	done
else 
	# Prerelease everything else
	git describe --tags --long  
	export VERSION=`git describe --tags --abbrev=0 | tr -d "v"`
	export DEV=`git describe --tags --long | cut -f2 -d-`
	export TAG='--tag next'

	for PKG in ${PROJECT_ROOT}/packages/* ; do
		cd ${PKG}
		npm version ${VERSION}
		npm version prerelease --preid="dev"${DEV}
	done
fi

cd ${PROJECT_ROOT}
node ${PROJECT_ROOT}/scripts/sync_versions.mjs

# if [[ "${GITHUB_REF}" =~ ^(refs/heads/master|refs/tags/v.+)$ && "$1" = "publish" ]] ; then
# 	cd ${PROJECT_ROOT}/packages/duckdb-wasm
# 
# 	echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc
# 	echo '@duckdb:registry=https://npm.pkg.github.com' >> .npmrc
# 	npm publish --access public ${TAG}
# fi
