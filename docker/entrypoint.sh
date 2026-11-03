#!/bin/sh
set -e
: "${DATABASE_PATH:=/app/data/nivaasa.db}"
FRESH=false
if [ ! -f "$DATABASE_PATH" ]; then FRESH=true; fi
mkdir -p "$(dirname "$DATABASE_PATH")"
cd /app/apps/web
npx drizzle-kit push --force
if [ "$FRESH" = "true" ] && [ "${SEED_DEMO:-true}" != "false" ]; then
  npm run db:seed
fi
cd /app
exec npm run start --workspace @mycommunity/web
