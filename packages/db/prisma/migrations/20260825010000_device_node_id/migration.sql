-- AlterTable
ALTER TABLE "Device" ADD COLUMN "nodeId" TEXT;

-- CreateIndex
CREATE INDEX "Device_nodeId_idx" ON "Device"("nodeId");
