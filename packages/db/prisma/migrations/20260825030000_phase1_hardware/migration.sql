-- AlterTable
ALTER TABLE "Device" ADD COLUMN "macAddress" TEXT;
ALTER TABLE "Device" ADD COLUMN "buildNumber" INTEGER;
ALTER TABLE "Device" ADD COLUMN "config" JSONB;

-- CreateTable
CREATE TABLE "Gateway" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gateway_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Gateway" ADD CONSTRAINT "Gateway_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
