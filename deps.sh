#!/bin/bash

set -ex

sudo npm install -g node-pre-gyp

PACKAGES="$(find -name node_modules -prune -or -name .meteor -prune -or -name package.json -print | sed -e 's,/package.json,,g')"

for pkg in $PACKAGES; do
    (cd "$pkg" && npm install)
done
