-- CreateTable
CREATE TABLE "AlertThreshold" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "metric" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "forSeconds" INTEGER NOT NULL DEFAULT 0,
    "severity" "AlertSeverity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AlertThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertThreshold_homeId_type_metric_key" ON "AlertThreshold"("homeId", "type", "metric");

-- AddForeignKey
ALTER TABLE "AlertThreshold" ADD CONSTRAINT "AlertThreshold_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;
