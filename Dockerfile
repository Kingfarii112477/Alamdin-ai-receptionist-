# syntax=docker/dockerfile:1
#
# This is the DEPLOYMENT Dockerfile — it targets PostgreSQL via
# prisma/production/schema.prisma, not the local-dev SQLite schema
# (prisma/schema.prisma, used by `npm run dev` / `npm test`, untouched).
#
# It builds against Postgres because most free container hosts (this image
# is built for, e.g. Back4App Containers, which requires a root-level
# Dockerfile with no custom path) give the container no persistent disk, so
# a SQLite file can't survive a restart/redeploy — set DATABASE_URL to a
# real Postgres instance (e.g. a free Neon database) when running this
# image. See README.md → "Deploying to Back4App Containers".

FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/production/schema.prisma

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Reuse the builder's node_modules (already includes the Postgres-targeted
# generated Prisma Client and the Prisma CLI, needed at boot to run
# `prisma migrate deploy`).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY web ./web

EXPOSE 3000

# Applies any pending Prisma migrations against prisma/production/migrations,
# then starts the server. Safe to run on every boot — Prisma Migrate is
# idempotent for already-applied migrations. Requires DATABASE_URL to be a
# PostgreSQL connection string at runtime.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/production/schema.prisma && node dist/server.js"]
