#!/bin/bash

set -e

PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"

if [ -z "${MONGO_URL+set}" ]; then
    export MONGO_URL="$(credstash get mongo)"
fi
if [ -z "${MAIL_URL+set}" ]; then
    export MAIL_URL="$(credstash get mailgun)"
fi
exec bash $METEORD_DIR/run_app.sh
