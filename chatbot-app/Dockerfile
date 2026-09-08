# ── Build stage ──────────────────────────────────────────────────────────────
FROM registry.redhat.io/ubi9/nodejs-20-minimal:latest AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM registry.redhat.io/ubi9/nodejs-20-minimal:latest

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

# Run as non-root
USER 1001

EXPOSE 8080

ENV PORT=8080

CMD ["node", "build/index.js"]
