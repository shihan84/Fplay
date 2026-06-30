# ============================================================
# Realtime Service (Socket.IO)
# ============================================================
FROM oven/bun:1 AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 realtime

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.ts ./

USER realtime

EXPOSE 3005

ENV PORT=3005

CMD ["bun", "index.ts"]