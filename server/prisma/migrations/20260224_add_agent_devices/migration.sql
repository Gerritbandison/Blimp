-- CreateTable
CREATE TABLE "AgentDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "platform" TEXT,
    "hostname" TEXT,
    "lastSeen" TIMESTAMP(3),
    "lastReport" TIMESTAMP(3),
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentDevice_tokenHash_key" ON "AgentDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "AgentDevice_tokenPrefix_idx" ON "AgentDevice"("tokenPrefix");

-- CreateIndex
CREATE INDEX "AgentDevice_isActive_idx" ON "AgentDevice"("isActive");
