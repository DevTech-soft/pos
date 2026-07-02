-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('RESERVADO', 'COMPLETADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "rentalId" TEXT;

-- CreateTable
CREATE TABLE "rental_spaces" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'RESERVADO',
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "amountPaid" DECIMAL(10,2),
    "change" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cashierSessionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_items" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rental_spaces_tenantId_idx" ON "rental_spaces"("tenantId");

-- CreateIndex
CREATE INDEX "rental_spaces_tenantId_isActive_idx" ON "rental_spaces"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "rentals_tenantId_idx" ON "rentals"("tenantId");

-- CreateIndex
CREATE INDEX "rentals_tenantId_status_idx" ON "rentals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "rentals_tenantId_startAt_idx" ON "rentals"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "rentals_cashierSessionId_idx" ON "rentals"("cashierSessionId");

-- CreateIndex
CREATE INDEX "rental_items_rentalId_idx" ON "rental_items"("rentalId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_items_rentalId_spaceId_key" ON "rental_items"("rentalId", "spaceId");

-- CreateIndex
CREATE INDEX "orders_rentalId_idx" ON "orders"("rentalId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_spaces" ADD CONSTRAINT "rental_spaces_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_cashierSessionId_fkey" FOREIGN KEY ("cashierSessionId") REFERENCES "cashier_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "rental_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
