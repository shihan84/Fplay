#!/bin/sh
set -e

echo "[ffplayout] Running Prisma schema push..."
bunx prisma db push --skip-generate 2>/dev/null || echo "[ffplayout] Prisma push warning (non-fatal)"

echo "[ffplayout] Starting Next.js server on port ${PORT:-3000}..."
exec bun .next/standalone/server.js