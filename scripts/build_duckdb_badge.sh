#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
BADGEGEN=${PROJECT_ROOT}/node_modules/.bin/badge

cd ${PROJECT_ROOT}/submodules/duckdb
VERSION=`git describe --tags --abbrev=0 | tr -d "v"`
DEV=`git describe --tags --long | cut -f2 -d-`

BADGE_LABEL_COLOR="#555"
BADGE_VALUE_COLOR="#007ec6"

if [[ "${DEV}" = "0" ]] ; then
    ${BADGEGEN} duckdb "v${VERSION}"  ${BADGE_VALUE_COLOR} ${BADGE_LABEL_COLOR}
else 
    ${BADGEGEN} duckdb "v${VERSION}-dev${DEV}" ${BADGE_VALUE_COLOR} ${BADGE_LABEL_COLOR}
fi
