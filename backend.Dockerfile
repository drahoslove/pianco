FROM node:14-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY . .
CMD ["node", "backend/server.js"]
