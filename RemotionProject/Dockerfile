FROM node:20-bullseye

# Install system dependencies for Remotion + Chromium + ffmpeg + TTS
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    espeak-ng \
    fonts-liberation \
    fonts-noto-cjk \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium path for Remotion rendering
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy project files
COPY . .

# Create output directories
RUN mkdir -p out public assets/music

# Expose server port
EXPOSE 4000

# Start the file server
CMD ["npx", "ts-node", "src/serve.ts"]
