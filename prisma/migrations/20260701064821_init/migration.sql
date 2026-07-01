-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('active', 'inactive', 'blacklisted', 'pending_verification');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('tax_registration', 'insurance', 'trade_license', 'safety_certificate', 'agreement');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "WorkRequirementStatus" AS ENUM ('draft', 'open', 'assigned', 'closed');

-- CreateTable
CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "vendor_type" VARCHAR(100) NOT NULL,
    "contact_name" VARCHAR(255),
    "contact_phone" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "current_status" "VendorStatus" NOT NULL DEFAULT 'pending_verification',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_category" (
    "vendor_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "added_by" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_category_pkey" PRIMARY KEY ("vendor_id","category_id")
);

-- CreateTable
CREATE TABLE "vendor_location" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "location" VARCHAR(255) NOT NULL,

    CONSTRAINT "vendor_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_document" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_url" TEXT NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_by" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_requirement" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "estimated_value" DECIMAL(14,2) NOT NULL,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'medium',
    "expected_start_date" DATE,
    "status" "WorkRequirementStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_rating" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "work_requirement_id" INTEGER NOT NULL,
    "rating_value" SMALLINT NOT NULL,
    "rated_by" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation" (
    "id" SERIAL NOT NULL,
    "work_requirement_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "rank_at_time_of_rec" INTEGER,
    "was_selected" BOOLEAN,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_location_vendor_id_location_key" ON "vendor_location"("vendor_id", "location");

-- CreateIndex
CREATE INDEX "idx_vendor_document_eligibility" ON "vendor_document"("vendor_id", "verification_status", "expiry_date");

-- CreateIndex
CREATE INDEX "vendor_rating_vendor_id_idx" ON "vendor_rating"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_rating_vendor_id_work_requirement_id_key" ON "vendor_rating"("vendor_id", "work_requirement_id");

-- CreateIndex
CREATE INDEX "recommendation_work_requirement_id_idx" ON "recommendation"("work_requirement_id");

-- AddForeignKey
ALTER TABLE "vendor_category" ADD CONSTRAINT "vendor_category_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_category" ADD CONSTRAINT "vendor_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_location" ADD CONSTRAINT "vendor_location_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_document" ADD CONSTRAINT "vendor_document_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_requirement" ADD CONSTRAINT "work_requirement_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_rating" ADD CONSTRAINT "vendor_rating_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_rating" ADD CONSTRAINT "vendor_rating_work_requirement_id_fkey" FOREIGN KEY ("work_requirement_id") REFERENCES "work_requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_work_requirement_id_fkey" FOREIGN KEY ("work_requirement_id") REFERENCES "work_requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
