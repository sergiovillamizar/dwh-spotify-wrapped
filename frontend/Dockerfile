# frontend/Dockerfile
# Multi-stage build for Next.js 14 App Router with output: standalone
#
# Stage 1 (builder) is intentionally skipped here — Cloud Build runs
# `npm ci` and `npm run build` as separate steps before docker build,
# so the .next/ output already exists in the build context.
# This image only packages the standalone server produced by Next.js.
#
# Project:  dwh-spotify-wrapped
# Author:   Didier / Sergio

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the standalone server (self-contained, includes node_modules subset)
COPY .next/standalone ./

# Copy static assets — served by the standalone server from /app/public
COPY public* ./public/

# Copy hashed static files — these are also served by the standalone server
# (CDN serves them via GCS, but standalone needs them as fallback)
COPY .next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
