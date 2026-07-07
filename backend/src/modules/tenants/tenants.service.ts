import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      include: {
        users: { where: { role: 'ADMIN' }, select: { id: true, name: true, email: true, isActive: true } },
        _count: { select: { users: true, employees: true } },
      },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        _count: { select: { employees: true, accessEntries: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const { adminName, adminEmail, adminPassword, ...tenantData } = dto;
    const exists = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (exists) throw new ConflictException('El email del admin ya está en uso');
    const hashed = await bcrypt.hash(adminPassword, 10);
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: tenantData });
      await tx.user.create({
        data: { name: adminName, email: adminEmail, password: hashed, role: 'ADMIN', tenantId: tenant.id },
      });
      return tx.tenant.findUnique({
        where: { id: tenant.id },
        include: { users: { where: { role: 'ADMIN' }, select: { id: true, name: true, email: true, isActive: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }
}
