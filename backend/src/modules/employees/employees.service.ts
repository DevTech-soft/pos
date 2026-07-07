import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

const USER_SELECT = { id: true, email: true, role: true, isActive: true } as const;

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId },
      include: { user: { select: USER_SELECT } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: { user: { select: USER_SELECT } },
    });
    if (!emp) throw new NotFoundException('Empleado no encontrado');
    return emp;
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const { grantAccess, password, accessRole, hiredAt, ...employeeData } = dto;

    if (!grantAccess) {
      return this.prisma.employee.create({
        data: { tenantId, ...employeeData, hiredAt: new Date(hiredAt) },
        include: { user: { select: USER_SELECT } },
      });
    }

    if (!employeeData.email) throw new BadRequestException('El email es obligatorio para dar acceso al sistema');
    if (!password) throw new BadRequestException('La contraseña es obligatoria para dar acceso al sistema');
    const exists = await this.prisma.user.findUnique({ where: { email: employeeData.email } });
    if (exists) throw new ConflictException('El email ya está en uso');
    const hashed = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: employeeData.name,
          email: employeeData.email!,
          password: hashed,
          role: accessRole ?? 'CAJERO',
          tenantId,
        },
      });
      return tx.employee.create({
        data: { tenantId, ...employeeData, hiredAt: new Date(hiredAt), userId: user.id },
        include: { user: { select: USER_SELECT } },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOne(tenantId, id);
    const { grantAccess, password, accessRole, revokeAccess, ...rest } = dto;
    const data: any = { ...rest };

    if (employee.userId) {
      const userData: any = {};
      if (password) userData.password = await bcrypt.hash(password, 10);
      if (accessRole) userData.role = accessRole;
      if (rest.email) userData.email = rest.email;
      if (rest.name) userData.name = rest.name;
      if (revokeAccess !== undefined) userData.isActive = !revokeAccess;
      if (Object.keys(userData).length > 0) {
        await this.prisma.user.update({ where: { id: employee.userId }, data: userData });
      }
    } else if (grantAccess) {
      const email = rest.email ?? employee.email;
      if (!email) throw new BadRequestException('El email es obligatorio para dar acceso al sistema');
      if (!password) throw new BadRequestException('La contraseña es obligatoria para dar acceso al sistema');
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists) throw new ConflictException('El email ya está en uso');
      const hashed = await bcrypt.hash(password, 10);
      const user = await this.prisma.user.create({
        data: { name: rest.name ?? employee.name, email, password: hashed, role: accessRole ?? 'CAJERO', tenantId },
      });
      data.userId = user.id;
    }

    return this.prisma.employee.update({
      where: { id },
      data,
      include: { user: { select: USER_SELECT } },
    });
  }
}
