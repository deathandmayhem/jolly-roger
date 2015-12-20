#!/bin/bash

set -e

export MONGO_URL="$(sneaker download mongo -)"
exec bash $METEORD_DIR/run_app.sh
