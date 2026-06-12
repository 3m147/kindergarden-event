#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

test -f .env || {
  echo "Missing deploy/oracle-compute/.env. Copy .env.example and fill in secrets first."
  exit 1
}

test -f wallet/tnsnames.ora || {
  echo "Missing Oracle wallet. Extract the wallet files into deploy/oracle-compute/wallet."
  exit 1
}

docker compose up -d --build
docker compose ps
