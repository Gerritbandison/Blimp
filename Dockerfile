# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (cache layer separate from source copy)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

ARG VITE_APP_NAME=Blimp
ARG VITE_AGENT_PORT=51723
ARG VITE_API_BASE_URL=

ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_AGENT_PORT=${VITE_AGENT_PORT}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Replace default nginx config with SPA-aware config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx runs on 80 internally; map to a host port at runtime
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
