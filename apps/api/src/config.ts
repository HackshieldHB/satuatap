export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "local-dev-jwt-secret-change-me",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "local-internal-key",
  gatewayUrl: process.env.GATEWAY_URL ?? "http://127.0.0.1:3100",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  mqttUrl: process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883",
};
