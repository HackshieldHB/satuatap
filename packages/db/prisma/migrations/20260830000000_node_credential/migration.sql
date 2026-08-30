-- CreateTable
CREATE TABLE "NodeCredential" (
    "nodeId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "mqttUsername" TEXT NOT NULL,
    "mqttPasswordHash" TEXT NOT NULL,

    CONSTRAINT "NodeCredential_pkey" PRIMARY KEY ("nodeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "NodeCredential_mqttUsername_key" ON "NodeCredential"("mqttUsername");
