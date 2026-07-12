-- CreateTable
CREATE TABLE "IcpProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enrichedData" TEXT,
    "searchQueries" TEXT,
    "scoreThreshold" INTEGER NOT NULL DEFAULT 60,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcpProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcpCompanyScore" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasoning" TEXT,
    "companyId" TEXT NOT NULL,
    "icpId" TEXT NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IcpCompanyScore_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ScraperTask" ADD COLUMN "icpProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IcpCompanyScore_companyId_icpId_key" ON "IcpCompanyScore"("companyId", "icpId");

-- AddForeignKey
ALTER TABLE "IcpProfile" ADD CONSTRAINT "IcpProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcpCompanyScore" ADD CONSTRAINT "IcpCompanyScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcpCompanyScore" ADD CONSTRAINT "IcpCompanyScore_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "IcpProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScraperTask" ADD CONSTRAINT "ScraperTask_icpProfileId_fkey" FOREIGN KEY ("icpProfileId") REFERENCES "IcpProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
