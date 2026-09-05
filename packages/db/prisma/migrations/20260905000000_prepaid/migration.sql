-- CreateTable
CREATE TABLE "PrepaidAccount" (
    "homeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "balanceIdr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lowBalanceThresholdIdr" INTEGER NOT NULL DEFAULT 20000,
    "electricityRelayDeviceId" TEXT,
    "waterValveDeviceId" TEXT,
    "disconnected" BOOLEAN NOT NULL DEFAULT false,
    "lowNotifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepaidAccount_pkey" PRIMARY KEY ("homeId")
);

-- CreateTable
CREATE TABLE "PrepaidTransaction" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountIdr" DECIMAL(14,2) NOT NULL,
    "balanceAfterIdr" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepaidTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrepaidTransaction_homeId_createdAt_idx" ON "PrepaidTransaction"("homeId", "createdAt");

-- AddForeignKey
ALTER TABLE "PrepaidAccount" ADD CONSTRAINT "PrepaidAccount_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepaidTransaction" ADD CONSTRAINT "PrepaidTransaction_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "PrepaidAccount"("homeId") ON DELETE CASCADE ON UPDATE CASCADE;
