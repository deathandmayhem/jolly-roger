#!/bin/bash

set -e

PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"

# We only have one proxy
export HTTP_FORWARDED_COUNT=1

# If we have less than 500M of memory, we don't have enough to run more than 1
# worker
MEMORY_KB="$(awk '$1=="MemTotal:" {print $2}' /proc/meminfo)"
if [ "$MEMORY_KB" -gt 512000 ]; then
    export CLUSTER_WORKERS_COUNT=auto
fi

if [ -z "${MONGO_URL+set}" ]; then
    export MONGO_URL="$(credstash get mongo)"
fi
if [ -z "${MONGO_OPLOG_URL+set}" ]; then
    export MONGO_OPLOG_URL="$(credstash get mongo/oplog)"
fi
if [ -z "${MAIL_URL+set}" ]; then
    export MAIL_URL="$(credstash get mailgun)"
fi

export GIT_REVISION="$(cat /built_app/GIT_REVISION)"

credstash get krb5.keytab | openssl base64 -d > /krb5.keytab

if [ -s /krb5.keytab ]; then
    exec k5start -U -f /krb5.keytab -- node main.js
else
    exec node main.js
fi
