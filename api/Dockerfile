# API Superbébé : Node 24 seul (node:sqlite, node:http, node:crypto), sans dépendance à installer.
FROM node:24-alpine
WORKDIR /app
COPY package.json db.js push.js server.js cles-vapid.js ./
RUN mkdir -p /donnees && chown node:node /donnees
USER node
ENV NODE_ENV=production PORT=8080 BASE=/donnees/superbebe.sqlite
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- --header "Origin: https://brunocambianica.github.io" http://127.0.0.1:8080/v1/etat > /dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
