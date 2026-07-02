import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Guardarraíl: esto es un borrado destructivo pensado solo para el Postgres
// local de desarrollo. Si el DATABASE_URL activo apunta a Supabase (o a
// cualquier host que no sea localhost/127.0.0.1), se aborta sin tocar nada.
function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? '';
  const isLocal = /@localhost|@127\.0\.0\.1/.test(url);
  if (!isLocal) {
    throw new Error(
      `DATABASE_URL no parece apuntar a un Postgres local (host detectado: "${url.replace(/:[^:@]+@/, ':****@')}"). ` +
      'Este script solo corre contra localhost — aborta. Si de verdad quieres borrar esa base, hazlo manualmente.',
    );
  }
}

async function main() {
  assertLocalDatabase();

  console.log('🧹 Borrando datos transaccionales (se conservan Users y Tenants)...\n');

  // Orden que respeta las FKs: hijos antes que padres.
  const steps: [string, () => Promise<{ count: number }>][] = [
    ['PayrollEntry', () => prisma.payrollEntry.deleteMany()],
    ['Sale', () => prisma.sale.deleteMany()],
    ['OrderItem', () => prisma.orderItem.deleteMany()],
    ['PurchaseOrderItem', () => prisma.purchaseOrderItem.deleteMany()],
    ['Order', () => prisma.order.deleteMany()],
    ['RentalItem', () => prisma.rentalItem.deleteMany()],
    ['AccessEntry', () => prisma.accessEntry.deleteMany()],
    ['Rental', () => prisma.rental.deleteMany()],
    ['CashExpense', () => prisma.cashExpense.deleteMany()],
    ['CashierSession', () => prisma.cashierSession.deleteMany()],
    ['PurchaseOrder', () => prisma.purchaseOrder.deleteMany()],
    ['ProductVariant', () => prisma.productVariant.deleteMany()],
    ['Product', () => prisma.product.deleteMany()],
    ['Supplier', () => prisma.supplier.deleteMany()],
    ['RentalSpace', () => prisma.rentalSpace.deleteMany()],
    ['PayrollPeriod', () => prisma.payrollPeriod.deleteMany()],
    ['Employee', () => prisma.employee.deleteMany()],
    ['GeneralExpense', () => prisma.generalExpense.deleteMany()],
  ];

  await prisma.$transaction(async () => {
    for (const [label, run] of steps) {
      const { count } = await run();
      console.log(`  ✓ ${label}: ${count} filas borradas`);
    }
  });

  const users = await prisma.user.count();
  const tenants = await prisma.tenant.count();
  console.log(`\n✅ Listo. Se conservaron ${users} usuarios y ${tenants} tenants.`);
}

main()
  .catch((e) => {
    console.error('\n❌', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
