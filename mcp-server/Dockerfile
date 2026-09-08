# ── Build stage ──────────────────────────────────────────────────────────────
FROM registry.redhat.io/ubi9/nodejs-20-minimal:latest AS builder

WORKDIR /app

# Install all deps (including devDependencies for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM registry.redhat.io/ubi9/nodejs-20-minimal:latest

WORKDIR /app

# Production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=builder /app/build ./build

# Run as non-root (uid 1001 is default in ubi9-minimal)
USER 1001

EXPOSE 8080

ENV PORT=8080

CMD ["node", "build/index.js"]
