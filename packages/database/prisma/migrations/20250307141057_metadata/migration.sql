-- AlterTable
ALTER TABLE "Company" ADD COLUMN "companyMetadataId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompanyMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notes" TEXT,
    "data" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "CompanyMetadata_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyWebsite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "link" TEXT NOT NULL,
    "thumbnail" TEXT,
    "data" TEXT,
    "metadataId" TEXT NOT NULL,
    CONSTRAINT "CompanyWebsite_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "CompanyMetadata" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMetadata_companyId_key" ON "CompanyMetadata"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWebsite_metadataId_key" ON "CompanyWebsite"("metadataId");
