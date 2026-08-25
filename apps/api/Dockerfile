FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY . .
RUN npm ci
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && npm run seed -w @satu-atap/db && npx tsx apps/api/src/index.ts"]
