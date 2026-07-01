# ============================================================
# Realtime Service (Socket.IO)
# ============================================================
FROM oven/bun:1 AS runner
WORKDIR /app

# Install ffmpeg, wget, and fonts for drawtext overlays
RUN apt-get update && apt-get install -y \
    ffmpeg wget \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-core \
    fonts-open-sans \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs realtime

# Create writable fontconfig cache dir so drawtext doesn't error
RUN mkdir -p /var/cache/fontconfig && chmod 777 /var/cache/fontconfig && \
    mkdir -p /home/realtime/.cache/fontconfig && \
    chown -R realtime:nodejs /home/realtime && \
    chmod -R 755 /home/realtime

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.ts ./

USER realtime

EXPOSE 3005

ENV PORT=3005
ENV HOME=/home/realtime
ENV FONTCONFIG_PATH=/etc/fonts
ENV FC_CACHEDIR=/var/cache/fontconfig

CMD ["bun", "index.ts"]