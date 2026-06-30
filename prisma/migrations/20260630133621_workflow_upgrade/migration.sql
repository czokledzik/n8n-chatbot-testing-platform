-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "responseTimeMs" INTEGER;

-- AlterTable
ALTER TABLE "TestRun" ADD COLUMN     "botVersionId" TEXT,
ADD COLUMN     "clientVerdict" TEXT,
ADD COLUMN     "clientVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "devFixNote" TEXT,
ADD COLUMN     "devFixedAt" TIMESTAMP(3),
ADD COLUMN     "improvementReason" TEXT,
ADD COLUMN     "improvementVerdict" TEXT,
ADD COLUMN     "issueTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceRunId" TEXT;

-- CreateTable
CREATE TABLE "BotVersion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "n8nWebhookUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "inputRunIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resultJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotVersion_clientId_idx" ON "BotVersion"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "BotVersion_clientId_label_key" ON "BotVersion"("clientId", "label");

-- CreateIndex
CREATE INDEX "AnalysisReport_clientId_createdAt_idx" ON "AnalysisReport"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "TestRun_clientId_botVersionId_idx" ON "TestRun"("clientId", "botVersionId");

-- CreateIndex
CREATE INDEX "TestRun_clientId_clientVerdict_idx" ON "TestRun"("clientId", "clientVerdict");

-- AddForeignKey
ALTER TABLE "BotVersion" ADD CONSTRAINT "BotVersion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_botVersionId_fkey" FOREIGN KEY ("botVersionId") REFERENCES "BotVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisReport" ADD CONSTRAINT "AnalysisReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
