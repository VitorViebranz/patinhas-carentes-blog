# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @patinhas/api --workspace @patinhas/shared

FROM deps AS app
COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node apps/api apps/api
COPY --chown=node:node packages/shared packages/shared
COPY --chown=node:node seed seed
RUN npm run db:generate -w @patinhas/api \
    && sed -i 's/\r$//' apps/api/docker-entrypoint.sh \
    && chmod +x apps/api/docker-entrypoint.sh

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown node:node /data /data/uploads
USER node
WORKDIR /app/apps/api
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then((r)=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "--import", "tsx", "src/server.ts"]
