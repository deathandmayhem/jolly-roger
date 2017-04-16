#!/bin/bash

set -e

PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"

# We only have one proxy
export HTTP_FORWARDED_COUNT=1

export CLUSTER_WORKERS_COUNT=auto

if [ -z "${MONGO_URL+set}" ]; then
    export MONGO_URL="$(credstash get mongo)"
fi
if [ -z "${MONGO_OPLOG_URL+set}" ]; then
    export MONGO_OPLOG_URL="$(credstash get mongo/oplog)"
fi
if [ -z "${MAIL_URL+set}" ]; then
    export MAIL_URL="$(credstash get mailgun)"
fi

export KADIRA_APP_ID=q7S8XNdYngs3Qnb66
if [ -z "${KADIRA_APP_SECRET+set}" ]; then
    export KADIRA_APP_SECRET="$(credstash get kadira)"
fi

if [ -z "${HONEYCOMB_WRITE_KEY+set}" ]; then
    export HONEYCOMB_WRITE_KEY="$(credstash get honeycomb)"
fi

export GIT_REVISION="$(cat /built_app/GIT_REVISION)"

credstash get krb5.keytab | openssl base64 -d > /krb5.keytab

if [ -f /krb5.keytab ]; then
   exec k5start -U -f /krb5.keytab -- node main.js
else
    exec node main.js
fi
