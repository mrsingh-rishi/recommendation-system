-- CreateTable
CREATE TABLE "vendor_rank" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "rank_value" DECIMAL(5,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_rank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_vendor_rank_category" ON "vendor_rank"("category_id", "rank_value" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_rank_vendor_id_category_id_key" ON "vendor_rank"("vendor_id", "category_id");

-- AddForeignKey
ALTER TABLE "vendor_rank" ADD CONSTRAINT "vendor_rank_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_rank" ADD CONSTRAINT "vendor_rank_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
