#!/usr/bin/env bash
set -euo pipefail

if [ -f /var/www/bety/.env ]; then
  set -a
  source /var/www/bety/.env
  set +a
fi

export NODE_ENV=production

cd /var/www/bety
exec npm run start
