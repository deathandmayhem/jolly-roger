#!/bin/bash

set -e

PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"

if [ -z "${MONGO_URL+set}" ]; then
    export MONGO_URL="$(credstash get mongo)"
fi
if [ -z "${MONGO_OPLOG_URL+set}" ]; then
    export MONGO_OPLOG_URL="$(credstash get mongo/oplog)"
fi
if [ -z "${MAIL_URL+set}" ]; then
    export MAIL_URL="$(credstash get mailgun)"
fi

credstash get krb5.keytab | openssl base64 -d > /krb5.keytab

exec k5start -U -f /krb5.keytab bash -- $METEORD_DIR/run_app.sh
