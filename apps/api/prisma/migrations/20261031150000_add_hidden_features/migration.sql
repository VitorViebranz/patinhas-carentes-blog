-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN "hidden_features" TEXT[] DEFAULT ARRAY[]::TEXT[];
