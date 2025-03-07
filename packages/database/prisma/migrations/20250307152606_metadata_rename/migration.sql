/*
  Warnings:

  - You are about to drop the column `companyMetadataId` on the `Company` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "link" TEXT NOT NULL,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "scrapedAt" DATETIME NOT NULL,
    "industryId" INTEGER,
    "regionId" INTEGER,
    "metadataId" TEXT,
    CONSTRAINT "Company_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Company_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("address", "email", "id", "industryId", "link", "name", "phone", "regionId", "reviewsCount", "scrapedAt", "website") SELECT "address", "email", "id", "industryId", "link", "name", "phone", "regionId", "reviewsCount", "scrapedAt", "website" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_link_key" ON "Company"("link");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
