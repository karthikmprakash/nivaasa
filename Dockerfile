FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY scripts ./scripts
RUN npm run build --workspace @mycommunity/web

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY package.json ./
COPY docker/entrypoint.sh /usr/local/bin/nivaasa-entrypoint
RUN chmod +x /usr/local/bin/nivaasa-entrypoint
EXPOSE 3000
ENTRYPOINT ["nivaasa-entrypoint"]
