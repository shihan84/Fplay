# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Generate Prisma client
COPY prisma ./prisma/
RUN bunx prisma generate

# ============================================================
# Stage 2: Build
# ============================================================
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

# ============================================================
# Stage 3: Production
# ============================================================
FROM oven/bun:1 AS runner
WORKDIR /app

# Install wget for the Docker healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/data/custom.db"

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema for potential migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

# Copy entrypoint script, make it executable, and convert CRLF to LF
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && sed -i 's/\r$//' docker-entrypoint.sh

# Create writable directories for SQLite, uploaded media, logos, and recordings
RUN mkdir -p /data && chown nextjs:nodejs /data
RUN mkdir -p /app/public/media && chown nextjs:nodejs /app/public/media
RUN mkdir -p /app/public/logos && chown nextjs:nodejs /app/public/logos
RUN mkdir -p /app/recordings && chown nextjs:nodejs /app/recordings

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/bin/sh", "./docker-entrypoint.sh"]