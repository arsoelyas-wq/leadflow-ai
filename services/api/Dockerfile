FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
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
  && (apt-get install -y --no-install-recommends libasound2 2>/dev/null || apt-get install -y --no-install-recommends libasound2t64 2>/dev/null || true) \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Write .gitconfig to rewrite SSH GitHub URLs to HTTPS
# (@whiskeysockets/baileys fetches libsignal-node via ssh:// which Docker cannot resolve)
RUN printf '[url "https://github.com/"]\n\tinsteadOf = git+ssh://git@github.com/\n\tinsteadOf = ssh://git@github.com/\n\tinsteadOf = git@github.com:\n' > /root/.gitconfig

COPY package.json ./
COPY tsconfig.json ./

RUN npm install --legacy-peer-deps

COPY src/ ./src/

RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3001
CMD ["node", "dist/index.js"]
