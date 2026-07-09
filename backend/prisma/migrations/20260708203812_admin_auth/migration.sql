-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "adminEmail" TEXT NOT NULL DEFAULT 'admin@gourmet.com',
ADD COLUMN     "adminPassword" TEXT NOT NULL DEFAULT 'admin123';
