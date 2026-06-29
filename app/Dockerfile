# syntax=docker/dockerfile:1
# Multi-stage build for the MMU Alumni Portal (React + Express/TS).
# No secrets are baked into any layer — JWT_SECRET and DB_* are passed at runtime.

# ---- Stage 1: build the Vite frontend (dist/) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: production runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Production deps only, plus tsx to run the TypeScript server entrypoint.
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx@^4 && npm cache clean --force
# App artifacts: built frontend, the server, and the sanitised mock seed.
COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY db.json ./
EXPOSE 3000
USER node
CMD ["npx", "tsx", "server.ts"]
