# Build de l'appli React (fichiers statiques) puis service via Nginx, qui
# reverse-proxy aussi /api/* vers la Gateway — voir nginx.conf.template. Même rôle
# que le proxy du serveur de dev Vite (vite.config.ts), pour ne pas avoir besoin
# de CORS côté backend même en usage "tout-en-un".

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# /etc/nginx/templates/*.template : l'image officielle Nginx substitue automatiquement
# les variables d'environnement (ici GATEWAY_URL) au démarrage du conteneur, avant de
# générer /etc/nginx/conf.d/default.conf — nécessaire car l'URL de la Gateway diffère
# entre Docker Compose local (nom DNS interne) et Render (URL publique HTTPS).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
