#!/bin/bash

set -eux
set -o pipefail

# Install apt https support for node
apt-get update
apt-get install --no-install-recommends -y apt-transport-https ca-certificates

# Add debathena and node apt repos
apt-key adv --keyserver keyserver.ubuntu.com --recv-key D1CD49BDD30B677273A75C66E4EE62700D8A9E8F
echo "deb http://debathena.mit.edu/apt trusty debathena debathena-config debathena-system" > /etc/apt/sources.list.d/debathena.list
apt-key adv --keyserver keyserver.ubuntu.com --recv-key 9FD3B784BC1C6FC31A8A0A1C1655A0AB68576280
echo "deb https://deb.nodesource.com/node_4.x trusty main" > /etc/apt/sources.list.d/node.list

# Install build deps
apt-get update
apt-get install --no-install-recommends -y python python-pip python-dev build-essential debathena-moira-clients kstart curl nodejs git

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
