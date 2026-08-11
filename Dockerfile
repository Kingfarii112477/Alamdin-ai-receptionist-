# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Reuse the builder's node_modules (already includes the generated Prisma
# Client and the Prisma CLI, needed at boot to run `prisma migrate deploy`).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY web ./web

EXPOSE 3000

# Applies any pending Prisma migrations, then starts the server. Safe to run
# on every boot — Prisma Migrate is idempotent for already-applied migrations.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
