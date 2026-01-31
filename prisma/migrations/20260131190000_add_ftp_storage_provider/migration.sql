-- DropIndex
DROP INDEX "StorageConnection_userId_key";

-- AlterEnum
ALTER TYPE "StorageProvider" ADD VALUE 'FTP';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeStorageProvider" "StorageProvider";

-- AlterTable
ALTER TABLE "StorageConnection" ADD COLUMN "port" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "StorageConnection_userId_provider_key" ON "StorageConnection"("userId", "provider");
