# ============================================================
# Realtime Service (Socket.IO)
# ============================================================
FROM oven/bun:1 AS runner
WORKDIR /app

# Install ffmpeg, wget, and comprehensive multilingual fonts for drawtext overlays
RUN apt-get update && apt-get install -y \
    ffmpeg wget fontconfig \
    # Latin, Cyrillic, Greek, basic coverage
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-liberation \
    fonts-liberation2 \
    fonts-freefont-ttf \
    fonts-open-sans \
    # Noto — covers 1000+ scripts/languages (Arabic, Hebrew, Devanagari,
    # Bengali, Tamil, Telugu, Kannada, Malayalam, Sinhala, Thai, Khmer,
    # Myanmar, Georgian, Armenian, Ethiopic, Tibetan, etc.)
    fonts-noto-core \
    fonts-noto-extra \
    fonts-noto-ui-core \
    fonts-noto-mono \
    fonts-noto-color-emoji \
    # CJK — Chinese (Simplified & Traditional), Japanese, Korean
    fonts-noto-cjk \
    # Additional scripts
    fonts-indic \
    fonts-lohit-deva \
    fonts-lohit-guru \
    fonts-lohit-beng-assamese \
    fonts-lohit-beng-bengali \
    fonts-lohit-taml \
    fonts-lohit-mlym \
    fonts-lohit-telu \
    fonts-lohit-knda \
    fonts-lohit-orya \
    fonts-lohit-gujr \
    fonts-arabeyes \
    fonts-hosny-amiri \
    fonts-culmus \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs realtime

# Pre-build fontconfig cache at image build time (avoids runtime delay)
RUN mkdir -p /var/cache/fontconfig && chmod 777 /var/cache/fontconfig && \
    fc-cache -f -v 2>&1 | tail -3

# Create user home and cache dirs
RUN mkdir -p /home/realtime/.cache/fontconfig && \
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