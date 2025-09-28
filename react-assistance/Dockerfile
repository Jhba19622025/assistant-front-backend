FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Inyectamos la base a build-time
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
# Si te falla por tipos, usa: RUN npx vite build
RUN npm run build

FROM public.ecr.aws/docker/library/nginx:alpine
# SPA fallback
RUN printf 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri /index.html; } \
} ' > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
