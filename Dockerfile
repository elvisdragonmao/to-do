FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN pnpm build
RUN pnpm deploy --filter @sprintly/api --prod /prod/api

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /prod/api ./api
COPY --from=build /app/apps/web/dist ./web

RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
ENV DATABASE_PATH=/app/data/sprintly.sqlite
ENV WEB_ROOT=/app/web
CMD ["node", "api/dist/index.js"]
