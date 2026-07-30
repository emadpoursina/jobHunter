# Build frontend
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY vite.config.js ./
COPY frontend ./frontend
RUN bun run build

# Runtime: API + static UI + Playwright Chromium
FROM oven/bun:1
WORKDIR /app

USER root
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production \
  && bunx playwright install --with-deps chromium

COPY server ./server
COPY collectors ./collectors
COPY pipeline ./pipeline
COPY --from=builder /app/frontend/dist ./frontend/dist

ENV PORT=3061 \
    REPO_ROOT=/repo \
    OLLAMA_BASE_URL=http://host.docker.internal:11434

EXPOSE 3061
CMD ["bun", "server/index.js"]
