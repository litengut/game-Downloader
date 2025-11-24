# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# # [optional] tests & build
# ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
# # Install gosu for PUID/PGID support
# RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*

COPY --from=install --chown=bun:bun /temp/prod/node_modules node_modules
COPY --from=prerelease --chown=bun:bun /usr/src/app/src src
COPY --from=prerelease --chown=bun:bun /usr/src/app/package.json .
COPY --from=prerelease --chown=bun:bun /usr/src/app/credentials.json .
COPY --from=prerelease --chown=bun:bun /usr/src/app/token.json .

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# run the app
# USER bun
ENV TERM=xterm-256color
ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD [ "bun", "run", "src/index.ts" ]