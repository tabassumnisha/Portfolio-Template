# Creative Portfolio CMS — container image. No npm install step: the app has no third-party dependencies.
# For fully reproducible builds, pin the base image by digest:  FROM node:22-alpine@sha256:<digest>
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node database ./database
COPY --chown=node:node Project ./Project
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
