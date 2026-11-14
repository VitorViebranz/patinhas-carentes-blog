-- AlterTable
ALTER TABLE "pickups" ADD COLUMN "bags" INTEGER,
ADD COLUMN "bag_liters" INTEGER;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN "vaccine_dose_cost_brl" DOUBLE PRECISION NOT NULL DEFAULT 60,
ADD COLUMN "kg_per_100l_bag" DOUBLE PRECISION NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "monthly_reports" ADD COLUMN "animals_vaccinated" INTEGER,
ADD COLUMN "doses_applied" INTEGER,
ADD COLUMN "dose_cost_brl" DECIMAL(10,2),
ADD COLUMN "medication_spent_brl" DECIMAL(10,2),
ADD COLUMN "feed_spent_brl" DECIMAL(10,2),
ADD COLUMN "castrations_done" INTEGER,
ADD COLUMN "other_income_brl" DECIMAL(10,2);
