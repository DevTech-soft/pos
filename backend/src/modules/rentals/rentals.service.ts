import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpaceDto, UpdateSpaceDto, CreateRentalDto, SettleRentalDto } from './dto/rental.dto';

const SPACES_INCLUDE = { items: { include: { space: true } } };
const OPEN_TAB_ORDERS_INCLUDE = {
  ...SPACES_INCLUDE,
  orders: {
    where: { status: 'PENDIENTE' as const },
    include: { items: { include: { productVariant: { include: { product: true } } } } },
  },
};

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService) {}

  // ── Espacios (catálogo) ───────────────────────────────────────────────────

  getSpaces(tenantId: string) {
    return this.prisma.rentalSpace.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  createSpace(tenantId: string, dto: CreateSpaceDto) {
    return this.prisma.rentalSpace.create({ data: { tenantId, ...dto } });
  }

  async updateSpace(tenantId: string, id: string, dto: UpdateSpaceDto) {
    const space = await this.prisma.rentalSpace.findFirst({ where: { id, tenantId } });
    if (!space) throw new NotFoundException('Espacio no encontrado');
    return this.prisma.rentalSpace.update({ where: { id }, data: dto });
  }

  // ── Reservas ──────────────────────────────────────────────────────────────

  getRentals(tenantId: string) {
    return this.prisma.rental.findMany({
      where: { tenantId },
      include: {
        ...SPACES_INCLUDE,
        orders: { include: { items: { include: { productVariant: { include: { product: true } } } } } },
      },
      orderBy: { startAt: 'desc' },
      take: 100,
    });
  }

  async createRental(tenantId: string, dto: CreateRentalDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException('La hora de fin debe ser posterior a la de inicio');

    const spaceIds = [...new Set(dto.spaceIds)];
    const spaces = await this.prisma.rentalSpace.findMany({ where: { id: { in: spaceIds }, tenantId, isActive: true } });
    if (spaces.length !== spaceIds.length) throw new BadRequestException('Espacio no encontrado en esta piscina');

    // Choque de horario: mismo espacio, reserva activa (no cancelada), rangos que se solapan.
    const conflict = await this.prisma.rental.findFirst({
      where: {
        tenantId,
        status: { not: 'CANCELADO' },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        items: { some: { spaceId: { in: spaceIds } } },
      },
      include: { items: { include: { space: true } } },
    });
    if (conflict) {
      const names = conflict.items.filter(i => spaceIds.includes(i.spaceId)).map(i => i.space.name).join(', ');
      throw new BadRequestException(`Ya hay una reserva que choca en ese horario para: ${names}`);
    }

    const totalAmount = spaces.reduce((acc, s) => acc + Number(s.price), 0);
    const isPayingNow = dto.cashierSessionId != null || dto.paymentMethod != null || dto.amountPaid != null;
    const rentalData = {
      tenantId,
      customerName: dto.customerName,
      phone: dto.phone,
      notes: dto.notes,
      startAt,
      endAt,
      totalAmount,
      items: { create: spaces.map(s => ({ spaceId: s.id, price: s.price })) },
    };

    if (!isPayingNow) {
      return this.prisma.rental.create({ data: rentalData, include: SPACES_INCLUDE });
    }

    if (!dto.cashierSessionId || !dto.paymentMethod || dto.amountPaid == null) {
      throw new BadRequestException('Para cobrar de inmediato se requiere caja, método de pago y monto recibido');
    }
    const session = await this.prisma.cashierSession.findFirst({ where: { id: dto.cashierSessionId, tenantId, status: 'ABIERTA' } });
    if (!session) throw new BadRequestException('Caja no encontrada o cerrada');

    const change = dto.amountPaid - totalAmount;
    if (change < 0) throw new BadRequestException('Monto insuficiente');

    const [rental] = await this.prisma.$transaction([
      this.prisma.rental.create({
        data: {
          ...rentalData,
          paymentMethod: dto.paymentMethod,
          amountPaid: dto.amountPaid,
          change,
          cashierSessionId: dto.cashierSessionId,
          paidAt: new Date(),
        },
        include: SPACES_INCLUDE,
      }),
      this.prisma.cashierSession.update({
        where: { id: dto.cashierSessionId },
        data: { totalSales: { increment: totalAmount }, totalIngresos: { increment: dto.amountPaid } },
      }),
    ]);
    return rental;
  }

  async cancelRental(tenantId: string, id: string) {
    const rental = await this.prisma.rental.findFirst({ where: { id, tenantId, status: 'RESERVADO', paymentMethod: null } });
    if (!rental) throw new NotFoundException('Reserva no encontrada, ya pagada o ya procesada');
    return this.prisma.rental.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  async completeRental(tenantId: string, id: string) {
    // Para reservas ya pagadas al reservar: solo marca que el evento ya terminó.
    const rental = await this.prisma.rental.findFirst({ where: { id, tenantId, status: 'RESERVADO', paymentMethod: { not: null } } });
    if (!rental) throw new NotFoundException('Reserva no encontrada o aún no está pagada');
    return this.prisma.rental.update({ where: { id }, data: { status: 'COMPLETADO' } });
  }

  // ── Cuentas abiertas ("tabs") ─────────────────────────────────────────────

  getOpenTabs(tenantId: string) {
    return this.prisma.rental.findMany({
      where: { tenantId, paymentMethod: null, status: 'RESERVADO' },
      include: OPEN_TAB_ORDERS_INCLUDE,
      orderBy: { startAt: 'asc' },
    });
  }

  async settleRental(tenantId: string, id: string, dto: SettleRentalDto) {
    const rental = await this.prisma.rental.findFirst({
      where: { id, tenantId, paymentMethod: null, status: 'RESERVADO' },
      include: { orders: { where: { status: 'PENDIENTE' } } },
    });
    if (!rental) throw new NotFoundException('Reserva no encontrada o ya pagada');

    const session = await this.prisma.cashierSession.findFirst({ where: { id: dto.cashierSessionId, tenantId, status: 'ABIERTA' } });
    if (!session) throw new BadRequestException('Caja no encontrada o cerrada');

    const pendingOrdersTotal = rental.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const grandTotal = Number(rental.totalAmount) + pendingOrdersTotal;
    const change = dto.amountPaid - grandTotal;
    if (change < 0) throw new BadRequestException('Monto insuficiente');

    await this.prisma.$transaction([
      this.prisma.rental.update({
        where: { id },
        data: {
          paymentMethod: dto.paymentMethod,
          amountPaid: dto.amountPaid,
          change,
          cashierSessionId: dto.cashierSessionId,
          paidAt: new Date(),
          status: 'COMPLETADO',
        },
      }),
      ...rental.orders.map(o => this.prisma.order.update({
        where: { id: o.id },
        data: { status: 'PAGADO', closedAt: new Date() },
      })),
      ...rental.orders.map(o => this.prisma.sale.create({
        data: {
          tenantId,
          orderId: o.id,
          cashierSessionId: dto.cashierSessionId,
          totalAmount: o.totalAmount,
          paymentMethod: dto.paymentMethod,
          amountPaid: o.totalAmount,
          change: 0,
        },
      })),
      this.prisma.cashierSession.update({
        where: { id: dto.cashierSessionId },
        data: { totalSales: { increment: grandTotal }, totalIngresos: { increment: dto.amountPaid } },
      }),
    ]);

    return this.prisma.rental.findUnique({
      where: { id },
      include: {
        ...SPACES_INCLUDE,
        orders: {
          include: { items: { include: { productVariant: { include: { product: true } } } }, sale: true },
        },
      },
    });
  }

  // ── Ventas ────────────────────────────────────────────────────────────────

  async getPaidRentals(tenantId: string) {
    const rentals = await this.prisma.rental.findMany({
      where: { tenantId, paymentMethod: { not: null } },
      include: {
        ...SPACES_INCLUDE,
        orders: { where: { status: 'PAGADO' }, include: { items: { include: { productVariant: { include: { product: true } } } } } },
      },
    });
    return rentals
      .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime())
      .slice(0, 100);
  }
}
