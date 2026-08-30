-- AlterTable
ALTER TABLE "DeviceCounterSnapshot" ADD COLUMN "recordedAt" TIMESTAMP(3);

-- Backfill from the latest telemetry row that carries this metric; else updatedAt.
UPDATE "DeviceCounterSnapshot" AS s
SET "recordedAt" = COALESCE(
  (
    SELECT t."recordedAt"
    FROM "TelemetryReading" AS t
    WHERE t."deviceId" = s."deviceId"
      AND (t."metrics" ->> s."metric") IS NOT NULL
    ORDER BY t."recordedAt" DESC
    LIMIT 1
  ),
  s."updatedAt"
);

ALTER TABLE "DeviceCounterSnapshot" ALTER COLUMN "recordedAt" SET NOT NULL;
