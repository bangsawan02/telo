# Tahap 1: Build Aplikasi (Vite & ESBuild)
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Tahap 2: Runtime Minimalis untuk Cloud Run & Chromium
FROM node:20-slim AS runner
WORKDIR /app

# Install pustaka sistem Linux minimalis yang dibutuhkan oleh Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    procps \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Salin package.json & install production dependencies saja
COPY package*.json ./
RUN npm ci --omit=dev

# Salin hasil build aplikasi & aset statis dari tahap builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/drizzle.config.ts ./

EXPOSE 3000

CMD ["npm", "start"]
