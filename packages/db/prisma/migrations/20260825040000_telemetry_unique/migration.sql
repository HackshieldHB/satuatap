-- Deduplicate before adding the unique constraint. Keep the newest row.
DELETE FROM "TelemetryReading" a
USING "TelemetryReading" b
WHERE a."deviceId" = b."deviceId"
  AND a."recordedAt" = b."recordedAt"
  AND a."createdAt" < b."createdAt";

DELETE FROM "TelemetryReading" a
USING "TelemetryReading" b
WHERE a."deviceId" = b."deviceId"
  AND a."recordedAt" = b."recordedAt"
  AND a."id" < b."id";

CREATE UNIQUE INDEX "TelemetryReading_deviceId_recordedAt_key" ON "TelemetryReading"("deviceId", "recordedAt");
