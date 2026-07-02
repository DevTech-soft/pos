import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterEntryDto, RegisterExitDto, UpdateAccessPricingDto, SettleTabDto } from './dto/access.dto';

const OPEN_TAB_ORDERS_INCLUDE = {
  orders: {
    where: { status: 'PENDIENTE' as const },
    include: { items: { include: { productVariant: { include: { product: true } } } } },
  },
};

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  async getPricing(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { entryAdultPrice: true, entryChildPrice: true, entryFreeUnderAge: true },
    });
    return tenant;
  }

  async updatePricing(tenantId: string, dto: UpdateAccessPricingDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
      select: { entryAdultPrice: true, entryChildPrice: true, entryFreeUnderAge: true },
    });
  }

  async registerEntry(tenantId: string, dto: RegisterEntryDto) {
    const adults = dto.adults ?? 0;
    const children = dto.children ?? 0;
    const freeMinors = dto.freeMinors ?? 0;
    const pax = adults + children + freeMinors;
    if (pax < 1) throw new BadRequestException('Debe registrar al menos una persona');

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { entryAdultPrice: true, entryChildPrice: true },
    });
    const totalAmount = adults * Number(tenant.entryAdultPrice) + children * Number(tenant.entryChildPrice);

    // Sin datos de pago -> queda como "cuenta abierta" (se cobra al salir, ver settleTab).
    const isPayingNow = dto.cashierSessionId != null || dto.paymentMethod != null || dto.amountPaid != null;
    if (!isPayingNow) {
      return this.prisma.accessEntry.create({
        data: { tenantId, visitorName: dto.visitorName, notes: dto.notes, pax, adults, children, freeMinors, totalAmount },
      });
    }

    if (!dto.cashierSessionId || !dto.paymentMethod || dto.amountPaid == null) {
      throw new BadRequestException('Para cobrar de inmediato se requiere caja, método de pago y monto recibido');
    }
    const session = await this.prisma.cashierSession.findFirst({ where: { id: dto.cashierSessionId, tenantId, status: 'ABIERTA' } });
    if (!session) throw new BadRequestException('Caja no encontrada o cerrada');

    const change = dto.amountPaid - totalAmount;
    if (change < 0) throw new BadRequestException('Monto insuficiente');

    const [entry] = await this.prisma.$transaction([
      this.prisma.accessEntry.create({
        data: {
          tenantId,
          visitorName: dto.visitorName,
          notes: dto.notes,
          pax, adults, children, freeMinors,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          amountPaid: dto.amountPaid,
          change,
          cashierSessionId: dto.cashierSessionId,
        },
      }),
      this.prisma.cashierSession.update({
        where: { id: dto.cashierSessionId },
        data: { totalSales: { increment: totalAmount }, totalIngresos: { increment: dto.amountPaid } },
      }),
    ]);
    return entry;
  }

  async registerExit(tenantId: string, entryId: string, dto: RegisterExitDto) {
    const entry = await this.prisma.accessEntry.findFirst({ where: { id: entryId, tenantId } });
    if (!entry) throw new NotFoundException('Entrada no encontrada');
    if (entry.paymentMethod === null) {
      throw new BadRequestException('Esta entrada tiene una cuenta abierta pendiente de pago; usa "Cobrar y salir"');
    }
    return this.prisma.accessEntry.update({
      where: { id: entryId },
      data: { exitTime: dto.exitTime ? new Date(dto.exitTime) : new Date() },
    });
  }

  // ── Cuentas abiertas ("tabs") ────────────────────────────────────────────

  getOpenTabs(tenantId: string) {
    return this.prisma.accessEntry.findMany({
      where: { tenantId, paymentMethod: null, exitTime: null },
      include: OPEN_TAB_ORDERS_INCLUDE,
      orderBy: { entryTime: 'asc' },
    });
  }

  async settleTab(tenantId: string, entryId: string, dto: SettleTabDto) {
    const entry = await this.prisma.accessEntry.findFirst({
      where: { id: entryId, tenantId, paymentMethod: null },
      include: OPEN_TAB_ORDERS_INCLUDE,
    });
    if (!entry) throw new NotFoundException('Cuenta no encontrada o ya pagada');

    const session = await this.prisma.cashierSession.findFirst({ where: { id: dto.cashierSessionId, tenantId, status: 'ABIERTA' } });
    if (!session) throw new BadRequestException('Caja no encontrada o cerrada');

    const pendingOrdersTotal = entry.orders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const grandTotal = Number(entry.totalAmount) + pendingOrdersTotal;
    const change = dto.amountPaid - grandTotal;
    if (change < 0) throw new BadRequestException('Monto insuficiente');

    await this.prisma.$transaction([
      this.prisma.accessEntry.update({
        where: { id: entryId },
        data: {
          paymentMethod: dto.paymentMethod,
          amountPaid: dto.amountPaid,
          change,
          cashierSessionId: dto.cashierSessionId,
          exitTime: new Date(),
        },
      }),
      ...entry.orders.map(o => this.prisma.order.update({
        where: { id: o.id },
        data: { status: 'PAGADO', closedAt: new Date() },
      })),
      ...entry.orders.map(o => this.prisma.sale.create({
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

    return this.prisma.accessEntry.findUnique({
      where: { id: entryId },
      include: {
        orders: {
          include: {
            items: { include: { productVariant: { include: { product: true } } } },
            sale: true,
          },
        },
      },
    });
  }

  // ── Ventas (entradas ya cobradas, con lo que se les haya cargado) ────────

  async getPaidEntries(tenantId: string) {
    const entries = await this.prisma.accessEntry.findMany({
      where: { tenantId, paymentMethod: { not: null } },
      include: {
        orders: {
          where: { status: 'PAGADO' },
          include: { items: { include: { productVariant: { include: { product: true } } } } },
        },
      },
    });
    return entries
      .map(e => ({ ...e, paidAt: e.exitTime ?? e.entryTime }))
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 100);
  }

  findToday(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.prisma.accessEntry.findMany({
      where: { tenantId, entryTime: { gte: start, lte: end } },
      orderBy: { entryTime: 'desc' },
    });
  }

  async getCurrentOccupancy(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const entries = await this.prisma.accessEntry.findMany({
      where: { tenantId, entryTime: { gte: start }, exitTime: null },
    });
    return { count: entries.reduce((acc, e) => acc + e.pax, 0), entries };
  }

  findByDate(tenantId: string, date: string) {
    const d = new Date(date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return this.prisma.accessEntry.findMany({
      where: { tenantId, entryTime: { gte: start, lte: end } },
      orderBy: { entryTime: 'desc' },
    });
  }

  async getDailyStats(tenantId: string, date: string) {
    const entries = await this.findByDate(tenantId, date);
    const totalPax = entries.reduce((acc, e) => acc + e.pax, 0);
    const totalRevenue = entries.reduce((acc, e) => acc + Number(e.totalAmount), 0);
    const withExit = entries.filter(e => e.exitTime);
    return {
      date, totalEntries: entries.length, totalPax, totalRevenue,
      withExit: withExit.length, stillInside: entries.length - withExit.length,
    };
  }
}
