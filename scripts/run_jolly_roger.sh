#!/bin/bash

set -e

PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"

if [ -z "${HTTP_FORWARDED_COUNT+set}" ]; then
    # We generally expect to have one proxy
    export HTTP_FORWARDED_COUNT=1
fi

if [ -z "${CLUSTER_WORKERS_COUNT+set}" ]; then
    # If we have less than 500M of memory, we don't have enough to run more
    # than 1 worker
    MEMORY_KB="$(awk '$1=="MemTotal:" {print $2}' /proc/meminfo)"
    if [ "$MEMORY_KB" -gt 512000 ]; then
        export CLUSTER_WORKERS_COUNT=auto
    fi
fi

if [ -z "${MONGO_URL}" ]; then
    export MONGO_URL="$(credstash get mongo)"
fi
if [ -z "${MONGO_OPLOG_URL}" ]; then
    export MONGO_OPLOG_URL="$(credstash get mongo/oplog)"
fi
if [ -z "${MAIL_URL+set}" ]; then
    export MAIL_URL="$(credstash get mailgun)"
fi
if [ -z "${BUGSNAG_API_KEY+set}" ]; then
    export BUGSNAG_API_KEY="$(credstash get bugsnag)"
fi

credstash get krb5.keytab | openssl base64 -d > /krb5.keytab

if [ -s /krb5.keytab ]; then
    exec k5start -U -f /krb5.keytab -- node main.js
else
    exec node main.js
fi
