ARG NODE_IMAGE=node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
ARG STATIC_IMAGE=nginx:mainline-alpine@sha256:7fc0fb4af7bf006aeb31aea88069976060f8f0a0a86b667126742cc17f4e31ae
ARG POSTGIS_IMAGE=postgis/postgis:15-3.7-alpine@sha256:7f7b453e0bde9dd7aa874585e5cea15704ed6e4d9fd9a1f48976267be99710a5
FROM ${POSTGIS_IMAGE} AS postgis
# Keep the upstream entrypoint's privilege drop while replacing its legacy Go binary.
RUN apk upgrade --no-cache \
    && apk add --no-cache su-exec \
    && rm -f /usr/local/bin/gosu /usr/local/bin/su-exec \
    && ln -s "$(command -v su-exec)" /usr/local/bin/gosu \
    && test "$(gosu postgres id -u)" = "$(id -u postgres)" \
    && test "$(gosu postgres id -g)" = "$(id -g postgres)"

# Export only the merged filesystem so removed packages are absent from every distributed layer.
FROM scratch AS postgis-distribution
COPY --from=postgis / /
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    LANG=en_US.utf8 PGDATA=/var/lib/postgresql/data PG_MAJOR=15 \
    PG_VERSION=15.20 POSTGIS_VERSION=3.7.0
LABEL org.opencontainers.image.source="https://github.com/postgis/docker-postgis"
EXPOSE 5432
VOLUME ["/var/lib/postgresql/data"]
STOPSIGNAL SIGINT
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]

FROM ${NODE_IMAGE} AS api-build
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM ${NODE_IMAGE} AS api
ENV NODE_ENV=production
WORKDIR /app/backend
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates \
    && rm -rf /usr/local/lib/node_modules/npm /opt/yarn-* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack
COPY --from=api-build /build/node_modules ./node_modules
COPY --from=api-build /build/dist ./dist
COPY database/migrations /app/database/migrations
RUN mkdir -p /var/lib/travelgo/media && chown node:node /var/lib/travelgo/media
USER node
CMD ["node", "dist/server.js"]

FROM ${NODE_IMAGE} AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/tsconfig*.json frontend/vite.config.* frontend/tailwind.config.js frontend/index.html ./
COPY frontend/src ./src
COPY frontend/public ./public
ENV VITE_API_URL=/api
RUN npm run build

FROM ${STATIC_IMAGE} AS gateway
RUN apk upgrade --no-cache

FROM gateway AS frontend
COPY deploy/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /build/dist /usr/share/nginx/html
