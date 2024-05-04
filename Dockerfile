# syntax=docker/dockerfile:1.4

# Build and test images (No need to worry about creating intermediate images)
#
# We use separate stages for running lint and test vs. building the production
# bundle so that they can run in parallel

FROM ubuntu:22.04 AS buildenv

ENV DEBIAN_FRONTEND noninteractive

# Install build deps
RUN <<'EOF'
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

# The easiest way to install puppeteer's dependencies is to pull the
# dependencies for Chrome. We don't actually need to install Chrome, but this
# prevents us from needing to manually maintain the list of dependencies here.
curl https://dl-ssl.google.com/linux/linux_signing_key.pub > /etc/apt/trusted.gpg.d/google.asc
echo "deb https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list
apt-get update
apt-get satisfy --no-install-recommends -y "$(apt-cache show google-chrome-stable | sed -ne 's/^Depends: //p')"
EOF

FROM buildenv as moiraenv

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

FROM buildenv as meteorenv

WORKDIR /app

ARG CI=true

# Install Meteor
COPY .meteor/release /app/.meteor/release
RUN <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
METEOR_RELEASE="$(sed -e 's/.*@//g' .meteor/release)"
curl -sL https://install.meteor.com?release=\$METEOR_RELEASE | sh
EOF

# Install meteor deps (list is sufficient to do this)
COPY .meteor /app/.meteor
RUN METEOR_ALLOW_SUPERUSER=1 meteor list
# Install app deps
COPY package.json package-lock.json tsconfig.json /app
COPY eslint /app/eslint
RUN --mount=type=cache,target=/root/.npm <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
meteor npm ci
meteor npm run prepare
EOF

COPY . /app

FROM meteorenv AS test

# Run lint
COPY <<'EOF' /test.sh
#!/bin/bash
set -eux
set -o pipefail
export METEOR_ALLOW_SUPERUSER=1
meteor npm run lint | sed -e "s,/app/,${PATH_PREFIX:+${PATH_PREFIX}/},g"
meteor npm run test
EOF
CMD ["/bin/bash", "/test.sh"]

FROM meteorenv AS build

# Generate production build
RUN --mount=type=cache,target=/app/.meteor/local/ meteor build --allow-superuser --directory /built_app --server=http://localhost:3000

# Install server dependencies
WORKDIR /built_app/bundle/programs/server
RUN --mount=type=cache,target=/root/.npm meteor npm install --production --omit=optional

# Production image
# (Be careful about creating as few layers as possible)

FROM ubuntu:22.04 AS production

# Install runtime deps
RUN <<'EOF'
#!/bin/bash
set -eux
set -o pipefail
. /etc/os-release

# Install apt https support for node.
apt-get update
apt-get install --no-install-recommends -y apt-transport-https ca-certificates curl

# Install moira dependencies (use the dev packages to avoid pinning to specific sonames)
apt-get install --no-install-recommends -y comerr-dev libkrb5-dev libreadline-dev libhesiod-dev libncurses5-dev

# Add node apt repo
curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key > /etc/apt/trusted.gpg.d/nodesource.asc
echo "deb https://deb.nodesource.com/node_14.x $VERSION_CODENAME main" > /etc/apt/sources.list.d/node.list
apt-get update

apt-get install --no-install-recommends -y awscli nodejs kstart

# Cleanup
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF

COPY --from=moiraenv --link /moira/build /
COPY --from=build --link /built_app /built_app
COPY scripts /built_app/scripts

ENV PORT 80
EXPOSE 80

# Mediasoup RTC ports
EXPOSE 10000-59999/udp
EXPOSE 10000-59999/tcp

WORKDIR /built_app/bundle
CMD /built_app/scripts/run_jolly_roger.sh
