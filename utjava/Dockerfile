# /Dockerfile (simple, solo entorno local)
FROM node:20-alpine

# Por qué: ruta estable y mínima
WORKDIR /app
ENV NODE_ENV=development

# Por qué: cachear deps entre builds locales
COPY package*.json ./
RUN npm install

# Código de la app
COPY . .

# Puertos: app + debugger
EXPOSE 3000 9229

# Dev mode con hot-reload de Nest CLI
CMD ["npm", "run", "start:dev"]
