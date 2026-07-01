-- AlterTable
ALTER TABLE "access_entries" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaid" DECIMAL(10,2),
ADD COLUMN     "cashierSessionId" TEXT,
ADD COLUMN     "change" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "children" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freeMinors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "entryAdultPrice" DECIMAL(10,2) NOT NULL DEFAULT 5000,
ADD COLUMN     "entryChildPrice" DECIMAL(10,2) NOT NULL DEFAULT 4000,
ADD COLUMN     "entryFreeUnderAge" INTEGER NOT NULL DEFAULT 4;

-- CreateIndex
CREATE INDEX "access_entries_cashierSessionId_idx" ON "access_entries"("cashierSessionId");

-- AddForeignKey
ALTER TABLE "access_entries" ADD CONSTRAINT "access_entries_cashierSessionId_fkey" FOREIGN KEY ("cashierSessionId") REFERENCES "cashier_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
