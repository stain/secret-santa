# Secret Santa: Node.js app with SQLite. Built with `podman build` and run as a
# systemd service through Podman Quadlet (deploy/templates/secret-santa.container.j2).
# Rebuilding with --pull picks up the latest Node.js 24 LTS patch release.

FROM docker.io/library/node:24-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run typecheck && npm run build

FROM docker.io/library/node:24-slim
ENV NODE_ENV=production PORT=8787 DATA_DIR=/data
WORKDIR /app
COPY --from=build /src/dist/server.mjs ./dist/server.mjs
# The static site (front page, privacy notice, assets) that nginx serves;
# copied out of the image by the Ansible playbook.
COPY --from=build /src/dist/www ./www
COPY public ./public
COPY migrations ./migrations
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8787/robots.txt').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/server.mjs"]
