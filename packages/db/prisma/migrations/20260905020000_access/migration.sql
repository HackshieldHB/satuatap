-- CreateTable
CREATE TABLE "AccessPass" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "createdById" TEXT,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'guest',
    "pin" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "passId" TEXT,
    "deviceId" TEXT,
    "action" TEXT NOT NULL,
    "actorLabel" TEXT NOT NULL,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessPass_token_key" ON "AccessPass"("token");

-- CreateIndex
CREATE INDEX "AccessPass_homeId_createdAt_idx" ON "AccessPass"("homeId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessLog_homeId_occurredAt_idx" ON "AccessLog"("homeId", "occurredAt");

-- AddForeignKey
ALTER TABLE "AccessPass" ADD CONSTRAINT "AccessPass_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_passId_fkey" FOREIGN KEY ("passId") REFERENCES "AccessPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
