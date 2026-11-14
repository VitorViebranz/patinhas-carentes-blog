-- CreateTable
CREATE TABLE "pickups" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "picked_up_on" DATE NOT NULL,
    "kg" DECIMAL(10,2) NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pickups_point_id_picked_up_on_idx" ON "pickups"("point_id", "picked_up_on");

-- CreateIndex
CREATE INDEX "pickups_picked_up_on_idx" ON "pickups"("picked_up_on");

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "collection_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pickups" ADD CONSTRAINT "pickups_kg_chk" CHECK ("kg" > 0);
