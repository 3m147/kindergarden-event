#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export ORACLE_JDBC_URL="${ORACLE_JDBC_URL:-jdbc:oracle:thin:@kindergarden_low?TNS_ADMIN=/Users/kkmm99jj/Downloads/Wallet_KINDERGARDEN}"
export ORACLE_DB_USERNAME="${ORACLE_DB_USERNAME:-KINDERGARDEN_APP}"

if [[ -z "${ORACLE_DB_PASSWORD:-}" ]]; then
  read -r -s -p "Oracle DB password for ${ORACLE_DB_USERNAME}: " ORACLE_DB_PASSWORD
  echo
  export ORACLE_DB_PASSWORD
fi

exec mvn spring-boot:run
