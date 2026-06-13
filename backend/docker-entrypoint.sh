#!/bin/sh

set -eu

if [ -f /secrets/oracle-wallet.zip ]; then
  mkdir -p /tmp/wallet
  unzip -oq /secrets/oracle-wallet.zip -d /tmp/wallet
  chmod 700 /tmp/wallet
fi

exec java -jar /app/app.jar
