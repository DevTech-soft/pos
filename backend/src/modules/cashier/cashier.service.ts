import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenCashierDto, CloseCashierDto } from './dto/cashier.dto';

@Injectable()
export class CashierService {
  constructor(private prisma: PrismaService) {}

  async getActive(tenantId: string) {
    return this.prisma.cashierSession.findFirst({
      where: { tenantId, status: 'ABIERTA' },
      include: {
        user: { select: { name: true, email: true } },
        sales: { orderBy: { createdAt: 'desc' }, take: 10 },
        cashExpenses: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async open(tenantId: string, userId: string, dto: OpenCashierDto) {
    const existing = await this.prisma.cashierSession.findFirst({ where: { tenantId, status: 'ABIERTA' } });
    if (existing) throw new BadRequestException('Ya hay una caja abierta');
    return this.prisma.cashierSession.create({
      data: { tenantId, userId, openingAmount: dto.openingAmount, notes: dto.notes },
    });
  }

  async close(tenantId: string, sessionId: string, dto: CloseCashierDto) {
    const session = await this.prisma.cashierSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.status === 'CERRADA') throw new BadRequestException('La caja ya está cerrada');

    const difference = Number(dto.closingAmount) - (Number(session.openingAmount) + Number(session.totalSales) - Number(session.totalExpenses));
    return this.prisma.cashierSession.update({
      where: { id: sessionId },
      data: { status: 'CERRADA', closingAmount: dto.closingAmount, difference, closedAt: new Date(), notes: dto.notes || session.notes },
    });
  }

  async addExpense(tenantId: string, sessionId: string, description: string, amount: number, notes?: string) {
    const session = await this.prisma.cashierSession.findFirst({ where: { id: sessionId, tenantId, status: 'ABIERTA' } });
    if (!session) throw new NotFoundException('Caja no encontrada o cerrada');

    const [expense] = await this.prisma.$transaction([
      this.prisma.cashExpense.create({ data: { tenantId, cashierSessionId: sessionId, description, totalAmount: amount, notes } }),
      this.prisma.cashierSession.update({ where: { id: sessionId }, data: { totalExpenses: { increment: amount } } }),
    ]);
    return expense;
  }

  findHistory(tenantId: string) {
    return this.prisma.cashierSession.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true } },
        _count: { select: { sales: true } },
      },
    });
  }

  async getReport(tenantId: string, sessionId: string) {
    const session = await this.prisma.cashierSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        sales: { include: { order: { include: { items: { include: { productVariant: { include: { product: true } } } } } } } },
        cashExpenses: true,
        user: { select: { name: true } },
      },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return session;
  }
}
