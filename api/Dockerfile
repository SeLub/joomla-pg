# api/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Включаем corepack и активируем pnpm
RUN corepack enable && corepack prepare pnpm@11 --activate

# Копируем манифесты + .npmrc
COPY package.json pnpm-lock.yaml .npmrc ./

# Устанавливаем зависимости (.npmrc автоматически применится)
# Используем --ignore-scripts чтобы избежать ошибок сборки в production
RUN pnpm install --frozen-lockfile --ignore-scripts

# Копируем исходники и собираем
COPY . .
RUN pnpm build

# =============================================================================
# Production stage
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Копируем собранный код и манифесты
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml .npmrc ./

# Устанавливаем только продакшен-зависимости (.npmrc применится)
RUN corepack enable && corepack prepare pnpm@11 --activate && \
    pnpm install --prod --frozen-lockfile --ignore-scripts

EXPOSE 3000
CMD ["node", "dist/main"]