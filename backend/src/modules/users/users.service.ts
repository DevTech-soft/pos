import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

// Un ADMIN solo puede gestionar usuarios operativos (Cajero/Empleado) de su propia
// piscina — nunca a otro Admin, al Superadmin, ni a usuarios de otro tenant.
type Requester = { tenantId: string | null };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId?: string) {
    return this.prisma.user.findMany({
      where: tenantId ? { tenantId } : {},
      select: { id: true, email: true, name: true, role: true, tenantId: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, requester?: Requester) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, tenantId: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (requester) this.assertManageable(user, requester);
    return user;
  }

  async create(dto: CreateUserDto, requester?: Requester) {
    if (requester) {
      if (dto.role && dto.role !== Role.CAJERO && dto.role !== Role.EMPLEADO) {
        throw new ForbiddenException('Un admin solo puede crear usuarios Cajero o Empleado');
      }
      dto.role = dto.role ?? Role.CAJERO;
    }
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está en uso');
    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: { id: true, email: true, name: true, role: true, tenantId: true, isActive: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, requester?: Requester) {
    const existing = await this.findOne(id, requester);
    if (requester && dto.role && dto.role !== Role.CAJERO && dto.role !== Role.EMPLEADO) {
      throw new ForbiddenException('Un admin solo puede asignar el rol Cajero o Empleado');
    }
    void existing;
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, tenantId: true, isActive: true },
    });
  }

  private assertManageable(target: { tenantId: string | null; role: Role }, requester: Requester) {
    if (target.role === Role.ADMIN || target.role === Role.SUPERADMIN) {
      throw new ForbiddenException('No tienes permisos para gestionar este usuario');
    }
    if (target.tenantId !== requester.tenantId) {
      throw new ForbiddenException('No tienes permisos para gestionar este usuario');
    }
  }
}
