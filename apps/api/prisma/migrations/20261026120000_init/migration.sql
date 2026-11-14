-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "PointCategory" AS ENUM ('PET_VET', 'EDUCATION', 'HEALTH', 'GROCERY_FOOD', 'COMMERCE_SERVICES');

-- CreateEnum
CREATE TYPE "LocationPrecision" AS ENUM ('HOUSE_NUMBER', 'STREET', 'PLACE_NAME', 'NEIGHBORHOOD');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HelpRequestType" AS ENUM ('COLLECTION_POINT', 'FOSTER', 'TALK');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('SCHOOL', 'COMPANY', 'STORE', 'CONDO');

-- CreateEnum
CREATE TYPE "HelpRequestStatus" AS ENUM ('NEW', 'ANSWERED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "outside_main_area" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "neighborhood_id" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "category" "PointCategory" NOT NULL,
    "opening_hours" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location_precision" "LocationPrecision" NOT NULL,
    "outside_main_area" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_requests" (
    "id" TEXT NOT NULL,
    "type" "HelpRequestType" NOT NULL,
    "requester_name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "institution_name" TEXT,
    "institution_type" "InstitutionType",
    "wants_talk" BOOLEAN NOT NULL DEFAULT false,
    "animal_capacity" INTEGER,
    "message" TEXT,
    "postal_code" TEXT,
    "address" TEXT,
    "neighborhood_name" TEXT,
    "consent_given_at" TIMESTAMP(3) NOT NULL,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'NEW',
    "answered_at" TIMESTAMP(3),
    "answered_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_reports" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_kg" DECIMAL(10,2) NOT NULL,
    "outcome_summary" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cover_media_id" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "grams_per_cap" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "kg_price_brl" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "spay_cost_brl" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "monthly_average_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "animals_served_year" INTEGER,
    "cnpj" TEXT,
    "pix_key" TEXT,
    "whatsapp_number" TEXT,
    "instagram_handle" TEXT,
    "adoption_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geocode_cache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_slug_key" ON "neighborhoods"("slug");

-- CreateIndex
CREATE INDEX "collection_points_neighborhood_id_status_idx" ON "collection_points"("neighborhood_id", "status");

-- CreateIndex
CREATE INDEX "help_requests_status_created_at_idx" ON "help_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reports_month_key" ON "monthly_reports"("month");

-- CreateIndex
CREATE UNIQUE INDEX "media_files_path_key" ON "media_files"("path");

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_status_published_at_idx" ON "stories"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "geocode_cache_query_key" ON "geocode_cache"("query");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_answered_by_id_fkey" FOREIGN KEY ("answered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Constraints Prisma cannot express (see ../checks.sql)
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_lat_chk" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_lon_chk" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_lat_chk" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_lon_chk" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_total_kg_chk" CHECK ("total_kg" >= 0);
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_month_chk" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_single_row_chk" CHECK ("id" = 1);
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_kg_price_chk" CHECK ("kg_price_brl" > 0);
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_spay_cost_chk" CHECK ("spay_cost_brl" > 0);
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_grams_chk" CHECK ("grams_per_cap" > 0);
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_monthly_avg_chk" CHECK ("monthly_average_kg" >= 0);
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_animals_chk" CHECK ("animals_served_year" IS NULL OR "animals_served_year" >= 0);
