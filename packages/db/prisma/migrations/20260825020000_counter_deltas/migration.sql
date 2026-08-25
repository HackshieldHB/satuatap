-- AlterTable
ALTER TABLE "TelemetryAggregate" ADD COLUMN "first" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DeviceCounterSnapshot" (
    "deviceId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCounterSnapshot_pkey" PRIMARY KEY ("deviceId","metric")
);

-- AddForeignKey
ALTER TABLE "DeviceCounterSnapshot" ADD CONSTRAINT "DeviceCounterSnapshot_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
