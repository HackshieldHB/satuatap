export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "local-dev-jwt-secret-change-me",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "local-internal-key",
  gatewayUrl: process.env.GATEWAY_URL ?? "http://127.0.0.1:3100",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  mqttUrl: process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
  // Demo affordance: let a signed-in user switch their own persona to preview
  // each menu. Set DEMO_ROLE_SWITCH=false in a real deployment to disable it.
  // `admin` can NEVER be self-assigned regardless of this flag.
  demoRoleSwitch: process.env.DEMO_ROLE_SWITCH !== "false",
  // Until SMTP is wired up, the password-reset endpoint returns the reset token
  // in its response so the flow is usable in the demo. Set EXPOSE_RESET_TOKEN=
  // false once real email delivery exists so tokens are never sent to the client.
  exposeResetToken: process.env.EXPOSE_RESET_TOKEN !== "false",
};
