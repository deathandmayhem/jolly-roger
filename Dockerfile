# syntax=docker/dockerfile:1.19

# Build and test images (No need to worry about creating intermediate images)
#
# We use separate stages for running lint and test vs. building the production
# bundle so that they can run in parallel

FROM ubuntu:22.04 AS buildenv

ENV DEBIAN_FRONTEND=noninteractive
ENV METEOR_ALLOW_SUPERUSER=1

# Install build deps
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
apt-get update
# We need:
# * git: for fetching moira and capturing git rev in Meteor artifact
# * curl: for the Meteor installer and fetching new apt keys
# * python3 et al: for building mediasoup
# * comerr-dev et al: for building moira
apt-get install --no-install-recommends -y \
	build-essential \
	git \
	curl \
	python3 python3-pip python3-dev python3-setuptools python3-wheel \
	comerr-dev libkrb5-dev libreadline-dev libhesiod-dev libncurses5-dev autoconf
EOF

FROM buildenv AS moiraenv

# Fetch source code
WORKDIR /moira/src
RUN git clone https://github.com/mit-athena/moira .

# Build moira
WORKDIR /moira/src/moira
RUN <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
# Update config.guess and config.sub to support aarch64 (note that in newer
# Ubuntu releases, this has moved to /usr/share/autoconf/build-aux)
cp /usr/share/autoconf/build-aux/config.{guess,sub} .
./configure --with-krb5 --with-com_err --with-afs --with-hesiod --with-readline --without-zephyr --without-java --prefix=/usr
make -j
make install DESTDIR=/moira/build
EOF

FROM buildenv AS meteorenv

WORKDIR /app

ARG CI=true

# Install Meteor and deps
COPY .meteor /app/.meteor
RUN --mount=type=cache,target=/root/.npm <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
METEOR_RELEASE="$(sed -e 's/.*@//g' .meteor/release)"
curl -sL "https://install.meteor.com?release=$METEOR_RELEASE" | sh

# This is sufficient to fetch our Meteor package dependencies
meteor list

# Meteor likes to install several copies of things like SWC so see if we can
# consolidate down
hardlink -c /root/.meteor
EOF

# Install app deps
COPY package.json package-lock.json tsconfig.json /app/
COPY eslint /app/eslint/
RUN --mount=type=cache,target=/root/.npm <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
export METEOR_OFFLINE_CATALOG=1
meteor npm ci
meteor npx playwright install --with-deps chromium
EOF

FROM meteorenv AS test

COPY . /app/

# Run lint
COPY <<'EOF' /test.sh
#!/bin/bash
set -eux
set -o pipefail
meteor npm run lint | sed -e "s,/app/,${PATH_PREFIX:+${PATH_PREFIX}/},g"
meteor npm run test
EOF
CMD ["/bin/bash", "/test.sh"]

FROM meteorenv AS build

# For production, we don't need a full git repository; just the commit hash
COPY --exclude=.git . /app
ARG METEOR_GIT_COMMIT_HASH
ENV METEOR_GIT_COMMIT_HASH=${METEOR_GIT_COMMIT_HASH}

# Generate production build
RUN --mount=type=cache,target=/app/.meteor/local/ meteor build --directory /built_app --server=http://localhost:3000

# Install server dependencies
WORKDIR /built_app/bundle/programs/server
RUN --mount=type=cache,target=/root/.npm meteor npm install --omit=dev

# Production image
# (Be careful about creating as few layers as possible)

FROM ubuntu:22.04 AS production

ARG METEOR_GIT_COMMIT_HASH
ENV METEOR_GIT_COMMIT_HASH=${METEOR_GIT_COMMIT_HASH}

# Install runtime deps
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
	<<'EOF'
#!/bin/bash
set -eux
set -o pipefail
. /etc/os-release

# Install apt https support for node and gpg for the nodesource key.
apt-get update
apt-get install --no-install-recommends -y apt-transport-https ca-certificates curl gpg

# Install moira dependencies (use the dev packages to avoid pinning to specific sonames)
apt-get install --no-install-recommends -y comerr-dev libkrb5-dev libreadline-dev libhesiod-dev libncurses5-dev

# Add node apt repo
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/node.list
apt-get update

apt-get install --no-install-recommends -y awscli nodejs kstart

# Cleanup
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF

COPY --from=moiraenv --link /moira/build /
COPY --from=build --link /built_app /built_app
COPY scripts /built_app/scripts

ENV PORT=80
EXPOSE 80

# Mediasoup RTC ports
EXPOSE 10000-59999/udp
EXPOSE 10000-59999/tcp

WORKDIR /built_app/bundle
CMD ["/built_app/scripts/run_jolly_roger.sh"]
