# syntax=docker/dockerfile:1.3-labs

# Build and test images (No need to worry about creating intermediate images)
#
# We use separate stages for running lint and test vs. building the production
# bundle so that they can run in parallel

FROM ubuntu:18.04 AS buildenv

ENV DEBIAN_FRONTEND noninteractive

# Install build deps
RUN <<EOF
	set -eux
	apt-get update
	apt-get install --no-install-recommends -y curl gnupg python3 python3-pip python3-dev python3-setuptools python3-wheel build-essential git

	# Install chromium-browser's dependencies, which should match puppeteer's
	# dependencies. Note: this will need to be updated when we upgrade to 20.04,
	# as chromium-browser on 20.04 is a wrapper around a snap package (although
	# `apt-get satisfy` will make it easier)
	apt-get install --no-install-recommends -y $(apt-cache depends chromium-browser | sed -ne 's/^ *Depends://p')
EOF

WORKDIR /app

ARG CI=true
ARG GITHUB_ACTIONS=

# Install Meteor
COPY .meteor/release /app/.meteor/release
RUN <<EOF bash
	set -eux
	set -o pipefail
	METEOR_RELEASE="$(sed -e 's/.*@//g' .meteor/release)"
	curl -sL https://install.meteor.com?release=\$METEOR_RELEASE | sh
EOF

# Install meteor deps (list is sufficient to do this)
COPY .meteor /app/.meteor
RUN METEOR_ALLOW_SUPERUSER=1 meteor list
# Install app deps
COPY package.json package-lock.json /app
RUN --mount=type=cache,target=/root/.npm meteor npm ci

COPY . /app

FROM buildenv AS test

# Run lint
COPY <<-EOF /test.sh
	#!/bin/bash
	set -eux
	set -o pipefail
	export METEOR_ALLOW_SUPERUSER=1
	meteor npm run lint | sed -e "s,/app/,\${PATH_PREFIX:+\${PATH_PREFIX}/},g"
	meteor npm run test
EOF
CMD ["/bin/bash", "/test.sh"]

FROM buildenv AS build

# Generate production build
RUN --mount=type=cache,target=/app/.meteor/local/ meteor build --allow-superuser --directory /built_app --server=http://localhost:3000

# Install server dependencies
WORKDIR /built_app/bundle/programs/server
RUN --mount=type=cache,target=/root/.npm meteor npm install --production

# Production image
# (Be careful about creating as few layers as possible)

FROM ubuntu:18.04 AS production

# Install runtime deps
RUN <<EOF
	set -eux
	. /etc/os-release

	# Install apt https support for node.  Install gnupg so that apt-key add works.
	apt-get update
	apt-get install --no-install-recommends -y apt-transport-https ca-certificates gnupg curl

	# Add debathena and node apt repos
	curl -s https://debathena.mit.edu/apt/debathena-archive.asc | apt-key add -
	echo "deb http://debathena.mit.edu/apt $VERSION_CODENAME debathena debathena-config debathena-system" > /etc/apt/sources.list.d/debathena.list
	curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
	echo "deb https://deb.nodesource.com/node_14.x $VERSION_CODENAME main" > /etc/apt/sources.list.d/node.list
	apt-get update

	# Install cryptography and boto3 from apt so we don't have to build them
	apt-get install --no-install-recommends -y python3-pip python3-cryptography python3-boto3 nodejs debathena-moira-clients kstart

	pip3 install credstash

	# Cleanup
	apt-get clean
	rm -rf /var/lib/apt/lists/*
EOF

COPY --from=build /built_app /built_app
COPY scripts /built_app/scripts

ARG GIT_REVISION
RUN <<EOF
	set -eux
	if [ -n "${GIT_REVISION:-}" ]; then
		echo $GIT_REVISION > /built_app/GIT_REVISION
	fi
EOF

ENV PORT 80
EXPOSE 80

# Mediasoup RTC ports
EXPOSE 10000-59999/udp
EXPOSE 10000-59999/tcp

WORKDIR /built_app/bundle
CMD /built_app/scripts/run_jolly_roger.sh
