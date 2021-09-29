#!/usr/bin/env bash

export TAG=''

# Is release?
if [[ "${GITHUB_REF}" =~ ^refs/tags/v.+$ ]] ; then
	npm version `echo ${GITHUB_REF} | sed 's|refs/tags/v||'`
else 
	# Prerelease everything else
	git describe --tags --long  
	export VERSION=`git describe --tags --abbrev=0 | tr -d "v"`
	export DEV=`git describe --tags --long | cut -f2 -d-`

	# Configure prerelease
	npm version ${VERSION}
	npm version prerelease --preid="dev"${DEV}
	export TAG='--tag next'
fi

# npm config set //registry.npmjs.org/:_authToken $NODE_AUTH_TOKEN
npm publish --access public $TAG
