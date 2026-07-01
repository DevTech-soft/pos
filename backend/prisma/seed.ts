import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Superadmin
  const superadminPass = await bcrypt.hash('superadmin123', 10);
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@poolmanager.com' },
    update: {},
    create: {
      email: 'superadmin@poolmanager.com',
      name: 'Super Admin',
      password: superadminPass,
      role: 'SUPERADMIN',
      tenantId: null,
    },
  });
  console.log('✅ Superadmin creado:', superadmin.email);

  // Tenant de ejemplo
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-demo-001' },
    update: {},
    create: {
      id: 'tenant-demo-001',
      name: 'Piscina El Paraíso',
      address: 'Calle 10 # 5-20, Bogotá',
      phone: '3001234567',
      email: 'info@piscinaelparaiso.com',
    },
  });
  console.log('✅ Tenant creado:', tenant.name);

  // Admin del tenant
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@piscinaelparaiso.com' },
    update: {},
    create: {
      email: 'admin@piscinaelparaiso.com',
      name: 'Administrador Piscina',
      password: adminPass,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // Cajero del tenant
  const cajeroPass = await bcrypt.hash('cajero123', 10);
  const cajero = await prisma.user.upsert({
    where: { email: 'cajero@piscinaelparaiso.com' },
    update: {},
    create: {
      email: 'cajero@piscinaelparaiso.com',
      name: 'Cajero Principal',
      password: cajeroPass,
      role: 'CAJERO',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Cajero creado:', cajero.email);

  // Proveedor de ejemplo
  const supplier = await prisma.supplier.upsert({
    where: { id: 'supplier-demo-001' },
    update: {},
    create: {
      id: 'supplier-demo-001',
      tenantId: tenant.id,
      name: 'Distribuidora Bebidas y Snacks S.A.S.',
      contactName: 'Jorge Peña',
      phone: '3009876543',
      email: 'ventas@distribuidorabys.com',
    },
  });
  console.log('✅ Proveedor creado:', supplier.name);

  // Productos con variantes (presentaciones) de ejemplo
  const products: {
    id: string
    name: string
    brand?: string
    category: string
    variants: {
      id: string
      name: string
      price: number
      cost: number
      stock: number
      purchaseUnit?: string
      saleUnit?: string
      unitsPerPurchase?: number
    }[]
  }[] = [
    {
      id: 'prod-coca-cola', name: 'Coca-Cola', brand: 'Coca-Cola', category: 'Bebidas',
      variants: [
        { id: 'var-coca-350', name: 'Lata 350ml', price: 2500, cost: 1200, stock: 48, purchaseUnit: 'Caja', saleUnit: 'Lata', unitsPerPurchase: 24 },
        { id: 'var-coca-600', name: 'Botella 600ml', price: 3500, cost: 1800, stock: 24, purchaseUnit: 'Caja', saleUnit: 'Botella', unitsPerPurchase: 12 },
      ],
    },
    {
      id: 'prod-agua', name: 'Agua Cristal', brand: 'Cristal', category: 'Bebidas',
      variants: [
        { id: 'var-agua-500', name: 'Botella 500ml', price: 2500, cost: 1000, stock: 60, purchaseUnit: 'Paquete', saleUnit: 'Botella', unitsPerPurchase: 12 },
      ],
    },
    {
      id: 'prod-gatorade', name: 'Gatorade', brand: 'Gatorade', category: 'Bebidas',
      variants: [
        { id: 'var-gatorade-500', name: 'Botella 500ml', price: 4500, cost: 2500, stock: 30, purchaseUnit: 'Caja', saleUnit: 'Botella', unitsPerPurchase: 12 },
      ],
    },
    {
      id: 'prod-papas-margarita', name: 'Papas Margarita', brand: 'Margarita', category: 'Papas fritas',
      variants: [
        { id: 'var-papas-marg-45', name: 'Bolsa 45g', price: 2500, cost: 1200, stock: 40, purchaseUnit: 'Caja', saleUnit: 'Bolsa', unitsPerPurchase: 20 },
      ],
    },
    {
      id: 'prod-papas-lays', name: 'Papas Lays', brand: 'Lays', category: 'Papas fritas',
      variants: [
        { id: 'var-papas-lays-42', name: 'Bolsa 42g', price: 3000, cost: 1500, stock: 35, purchaseUnit: 'Caja', saleUnit: 'Bolsa', unitsPerPurchase: 20 },
      ],
    },
    {
      id: 'prod-skittles', name: 'Skittles', brand: 'Skittles', category: 'Dulces',
      variants: [
        { id: 'var-skittles-38', name: 'Bolsa 38g', price: 2000, cost: 900, stock: 50, purchaseUnit: 'Caja', saleUnit: 'Bolsa', unitsPerPurchase: 24 },
      ],
    },
    {
      id: 'prod-trululu', name: 'Trululú', brand: 'Colombina', category: 'Dulces',
      variants: [
        { id: 'var-trululu-unidad', name: 'Unidad', price: 1000, cost: 400, stock: 100, purchaseUnit: 'Bolsa', saleUnit: 'Unidad', unitsPerPurchase: 50 },
      ],
    },
    {
      id: 'prod-protector-solar', name: 'Protector solar', category: 'Cuidado personal',
      variants: [
        { id: 'var-protector-120ml', name: '120ml', price: 18000, cost: 11000, stock: 15, purchaseUnit: 'Unidad', saleUnit: 'Unidad', unitsPerPurchase: 1 },
      ],
    },
    {
      id: 'prod-gorra', name: 'Gorra de natación', category: 'Accesorios',
      variants: [
        { id: 'var-gorra-unica', name: 'Talla única', price: 15000, cost: 8000, stock: 20, purchaseUnit: 'Unidad', saleUnit: 'Unidad', unitsPerPurchase: 1 },
      ],
    },
  ];

  let variantCount = 0;
  for (const p of products) {
    const { variants, ...productData } = p;
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, tenantId: tenant.id, ...productData },
    });
    for (const v of variants) {
      const { id: variantId, ...variantData } = v;
      await prisma.productVariant.upsert({
        where: { id: variantId },
        update: {},
        create: { id: variantId, tenantId: tenant.id, productId: p.id, ...variantData },
      });
      variantCount++;
    }
  }
  console.log('✅ Productos creados:', products.length, '· Variantes:', variantCount);

  // Empleados de ejemplo
  const employees = [
    { name: 'Carlos Ramírez', role: 'Salvavidas', baseSalary: 1200000 },
    { name: 'Ana Gómez', role: 'Instructora de natación', baseSalary: 1500000 },
    { name: 'Luis Torres', role: 'Mantenimiento', baseSalary: 1000000 },
  ];

  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({ where: { tenantId: tenant.id, name: emp.name } });
    if (!existing) {
      await prisma.employee.create({
        data: { tenantId: tenant.id, hiredAt: new Date('2025-01-01'), ...emp },
      });
    }
  }
  console.log('✅ Empleados creados:', employees.length);

  console.log('\n🏊 Seed completado exitosamente!\n');
  console.log('Credenciales:');
  console.log('  Superadmin: superadmin@poolmanager.com / superadmin123');
  console.log('  Admin:      admin@piscinaelparaiso.com / admin123');
  console.log('  Cajero:     cajero@piscinaelparaiso.com / cajero123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
