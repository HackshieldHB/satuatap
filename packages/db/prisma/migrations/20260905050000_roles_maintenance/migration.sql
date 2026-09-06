-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('resident', 'manager', 'operator');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'resident';

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "underMaintenance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Device" ADD COLUMN "maintenanceNote" TEXT;
