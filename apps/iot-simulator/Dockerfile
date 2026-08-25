FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "tsx", "apps/iot-simulator/src/index.ts"]
