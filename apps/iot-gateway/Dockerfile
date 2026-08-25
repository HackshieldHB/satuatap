FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "tsx", "apps/iot-gateway/src/index.ts"]
