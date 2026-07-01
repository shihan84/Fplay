#!/bin/sh
set -e

echo "[ffplayout] Running Prisma schema push..."
bunx prisma db push --accept-data-loss || echo "[ffplayout] Prisma push warning (non-fatal)"

echo "[ffplayout] Starting Next.js server on port ${PORT:-3000}..."
exec bun server.js