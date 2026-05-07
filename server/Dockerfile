# STEP 7 — Multi-stage Dockerfile.
#
# Stage 1 ("deps") installs production dependencies in a sandbox so the final
# image doesn't carry npm's cache or any devDependencies. Stage 2 copies the
# resolved node_modules + source code into a slim runtime image.

FROM node:22-alpine AS deps
WORKDIR /app

# Workspace root manifests come first. Copying ONLY package.json files lets
# Docker cache `npm install` whenever source files change but deps don't.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
# We don't install client/ deps in the server image — client deploys separately.

# `--workspace=server` keeps the install scoped: client deps stay un-fetched.
# `--include=dev=false` mirrors npm's prod-only mode without needing NODE_ENV.
RUN npm install --workspace=server --omit=dev

# ---------------------------------------------------------------------------

FROM node:22-alpine AS runtime
WORKDIR /app

# Run as the non-root `node` user that the official image already provides.
# This is one of the cheapest hardenings available and stops a compromised
# process from writing to /etc or /usr.
USER node

ENV NODE_ENV=production \
    PORT=8080

# Copy resolved deps (npm hoists into root /app/node_modules) and source.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server/package.json ./server/package.json
COPY --chown=node:node server/src ./server/src

EXPOSE 8080

# `node --enable-source-maps` makes stack traces show .js (not bundled) lines
# even when we eventually add a build step. Cheap insurance.
CMD ["node", "--enable-source-maps", "server/src/index.js"]
