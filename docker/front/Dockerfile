# Stage 0, "build-apps", based on Node.js, to build and compile both frontend apps sequentially
# Each app's About-dialog version comes from its package.json at build time (not stack VERSION).
ARG NODE_VERSION=24.22.0
FROM node:${NODE_VERSION} AS build-apps
ARG PUBLIC_BASE_PATH=/
ARG ENVIRONMENT=development
ENV PUBLIC_BASE_PATH=${PUBLIC_BASE_PATH}
ENV ENVIRONMENT=${ENVIRONMENT}
# Cache apt-get packages and install gettext
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y gettext curl ca-certificates
# Ensure case sensitivity is handled properly
ENV NODE_OPTIONS="--preserve-symlinks"
# Standalone pnpm install at the packageManager version. Corepack stays off.
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm/bin:${PATH}"
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=12.15.0 PNPM_HOME=/pnpm SHELL=/bin/bash sh -
COPY config/npm-userconfig /etc/sitmun-npm-userconfig
ENV NPM_CONFIG_USERCONFIG=/etc/sitmun-npm-userconfig
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# Build admin app first. .npmrc sets strict-peer-dependencies=false so the current peer graph installs.
COPY sitmun-admin/package.json sitmun-admin/pnpm-lock.yaml sitmun-admin/pnpm-workspace.yaml sitmun-admin/.npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm ci --store-dir /pnpm/store
COPY --chown=node:node sitmun-admin/*.json sitmun-admin/*.js ./
COPY --chown=node:node sitmun-admin/src/ ./src/
COPY --chown=node:node docker/front/admin/environment.prod.ts.template ./src/environments/environment.prod.ts.template
RUN export BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z") && \
    export APP_VERSION=$(node -p "require('./package.json').version") && \
    if [ "${ENVIRONMENT}" = "production" ]; then export FRONT_ENV=Production; export FRONT_PRODUCTION=true; else export FRONT_ENV=Development; export FRONT_PRODUCTION=false; fi && \
    envsubst '$BUILD_TIMESTAMP,$APP_VERSION,$FRONT_ENV,$PUBLIC_BASE_PATH' < ./src/environments/environment.prod.ts.template > ./src/environments/environment.prod.ts
RUN if [ "${ENVIRONMENT}" = "development" ]; then \
      pnpm run build -- --configuration=docker-dev --base-href=${PUBLIC_BASE_PATH}admin/; \
    else \
      pnpm run build -- --configuration=production --base-href=${PUBLIC_BASE_PATH}admin/; \
    fi

# Clean up and prepare for viewer app build
RUN rm -rf node_modules package*.json pnpm-lock.yaml pnpm-workspace.yaml src
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# Build viewer app second
COPY sitmun-viewer/package.json sitmun-viewer/pnpm-lock.yaml sitmun-viewer/pnpm-workspace.yaml ./
COPY --chown=node:node sitmun-viewer/scripts/ ./scripts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm ci --store-dir /pnpm/store
COPY --chown=node:node sitmun-viewer/*.json sitmun-viewer/*.js ./
COPY --chown=node:node sitmun-viewer/src/ ./src/
COPY --chown=node:node docker/front/viewer/environment.prod.ts.template ./src/environments/environment.prod.ts.template
COPY --chown=node:node docker/front/viewer/index.html.template ./src/index.html.template
COPY --chown=node:node docker/front/viewer/webpack.config.js.template ./webpack.config.js.template
# Cap the viewer webpack heap so the build works when Docker VM RAM < 8 GiB.
# Local pnpm run build uses 8192 MiB (the script default) when NODE_OPTIONS is unset.
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN export BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z") && \
    export APP_VERSION=$(node -p "require('./package.json').version") && \
    if [ "${ENVIRONMENT}" = "production" ]; then export FRONT_ENV=Production; export FRONT_PRODUCTION=true; else export FRONT_ENV=Development; export FRONT_PRODUCTION=false; fi && \
    envsubst '$BUILD_TIMESTAMP,$APP_VERSION,$FRONT_ENV,$PUBLIC_BASE_PATH' < ./src/environments/environment.prod.ts.template > ./src/environments/environment.prod.ts
RUN envsubst < ./src/index.html.template > ./src/index.html
RUN envsubst '$$PUBLIC_BASE_PATH' < ./webpack.config.js.template > ./webpack.config.js
RUN if [ "${ENVIRONMENT}" = "development" ]; then \
      pnpm run build -- --configuration=docker-dev --base-href=${PUBLIC_BASE_PATH}viewer/; \
    else \
      pnpm run build -- --configuration=production --base-href=${PUBLIC_BASE_PATH}viewer/; \
    fi

# Stage 1, based on Nginx, to have only the compiled apps, ready for production with Nginx
FROM nginx:1.27-alpine
COPY --from=build-apps /home/node/app/dist/admin-app/ /usr/share/nginx/html/admin
COPY --from=build-apps /home/node/app/dist/viewer-app/ /usr/share/nginx/html/viewer
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD wget -q --spider http://localhost/admin/ || exit 1
