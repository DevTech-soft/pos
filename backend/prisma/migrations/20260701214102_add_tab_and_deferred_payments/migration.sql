-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "accessEntryId" TEXT;

-- CreateIndex
CREATE INDEX "orders_accessEntryId_idx" ON "orders"("accessEntryId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_accessEntryId_fkey" FOREIGN KEY ("accessEntryId") REFERENCES "access_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
