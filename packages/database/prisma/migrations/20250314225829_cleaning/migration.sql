/*
  Warnings:

  - You are about to drop the column `industryId` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `regionId` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the `Industry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Region` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ScraperTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PROCESSED', 'PAUSED', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "ScrapedLinkStatus" AS ENUM ('PENDING', 'RUNNING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR');

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_industryId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_regionId_fkey";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "industryId",
DROP COLUMN "regionId";

-- DropTable
DROP TABLE "Industry";

-- DropTable
DROP TABLE "Region";

-- CreateTable
CREATE TABLE "ScraperTask" (
    "id" TEXT NOT NULL,
    "status" "ScraperTaskStatus" NOT NULL DEFAULT 'PENDING',
    "scraperType" TEXT NOT NULL,
    "scraperConfig" TEXT NOT NULL,
    "searchQuery" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "ScraperTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapedLink" (
    "id" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "status" "ScrapedLinkStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "companyId" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperTaskLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperTaskLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScrapedLink" ADD CONSTRAINT "ScrapedLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScraperTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScraperTaskLog" ADD CONSTRAINT "ScraperTaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScraperTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
