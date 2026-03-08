FROM node:20-slim

# Chromium ve sistem kütüphaneleri
RUN apt-get update && apt-get install -y \
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

# Puppeteer'ın kendi Chromium indirmesini engelle, sistem Chromium'unu kullan
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3001

CMD ["node", "dist/index.js"]