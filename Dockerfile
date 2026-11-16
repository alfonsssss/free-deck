# Kortbord multiplayer server
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN node scripts/build-rules.js
ENV PORT=8080 KORTBORD_DB=/tmp/kortbord.db
EXPOSE 8080
CMD ["node", "server.js"]
