#!/bin/bash

set -eux
set -o pipefail

# Install apt https support for node.  Install gnupg so that apt-key add works.
apt-get update
apt-get install --no-install-recommends -y apt-transport-https ca-certificates gnupg curl

# Add debathena and node apt repos
curl -s https://debathena.mit.edu/apt/debathena-archive.asc | apt-key add -
echo "deb http://debathena.mit.edu/apt bionic debathena debathena-config debathena-system" > /etc/apt/sources.list.d/debathena.list
curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
echo "deb https://deb.nodesource.com/node_8.x bionic main" > /etc/apt/sources.list.d/node.list

# Install build deps
apt-get update
apt-get install --no-install-recommends -y python python-pip python-dev python-setuptools python-wheel build-essential debathena-moira-clients kstart nodejs git

pip install 'credstash==1.12.0'

# Install meteor and build app
METEOR_RELEASE="$(sed -e 's/.*@//g' .meteor/release)"
curl -sL https://install.meteor.com?release=$METEOR_RELEASE | sh
meteor npm i
meteor build --allow-superuser --directory /built_app --server=http://localhost:3000

git rev-parse HEAD > /built_app/GIT_REVISION

(cd /built_app/bundle/programs/server && npm i)
cp -a /app/scripts /built_app/scripts

# Cleanup
rm -rf ~/.meteor /app
apt-get remove -y python-dev build-essential git
apt-get autoremove -y
apt-get clean
rm -rf /var/lib/apt/lists/*
