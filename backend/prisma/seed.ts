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

  // Productos de ejemplo
  const products = [
    { name: 'Gorra de natación', category: 'Accesorios', price: 15000 },
    { name: 'Gafas de natación', category: 'Accesorios', price: 25000 },
    { name: 'Protector solar', category: 'Cuidado personal', price: 18000 },
    { name: 'Agua 500ml', category: 'Bebidas', price: 2500 },
    { name: 'Gatorade', category: 'Bebidas', price: 4500 },
    { name: 'Snack energético', category: 'Snacks', price: 3500 },
    { name: 'Inscripción clases natación', category: 'Servicios', price: 120000 },
    { name: 'Entrada diaria adulto', category: 'Entradas', price: 12000 },
    { name: 'Entrada diaria niño', category: 'Entradas', price: 8000 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: `prod-${p.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: { id: `prod-${p.name.toLowerCase().replace(/\s+/g, '-')}`, tenantId: tenant.id, ...p },
    });
  }
  console.log('✅ Productos creados:', products.length);

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
