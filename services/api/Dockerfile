FROM node:20-slim

RUN apt-get update && apt-get install -y \
  git \
  chromium \
  libglib2.0-0 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxi6 \
  libxtst6 \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Tüm kaynak dosyaları kopyala
COPY package.json ./
COPY tsconfig.json ./

# Hem prod hem dev bağımlılıkları kur (build için typescript lazım)
RUN npm install --legacy-peer-deps

# Kaynak kodunu kopyala ve build et
COPY src/ ./src/

# TypeScript build
RUN npm run build

# Dev bağımlılıklarını kaldır
RUN npm prune --omit=dev

EXPOSE 3001
CMD ["node", "dist/index.js"]