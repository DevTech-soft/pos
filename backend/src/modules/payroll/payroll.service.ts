import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePayrollPeriodDto, UpdatePayrollEntryDto, MarkPaidDto } from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async createPeriod(tenantId: string, dto: CreatePayrollPeriodDto) {
    const employees = await this.prisma.employee.findMany({ where: { tenantId, isActive: true } });
    if (employees.length === 0) throw new BadRequestException('No hay empleados activos para generar nómina');

    return this.prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: { tenantId, periodType: dto.periodType, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), notes: dto.notes },
      });
      await tx.payrollEntry.createMany({
        data: employees.map(emp => ({
          payrollPeriodId: period.id,
          employeeId: emp.id,
          baseSalary: emp.baseSalary,
          extras: 0,
          deductions: 0,
          total: emp.baseSalary,
        })),
      });
      return tx.payrollPeriod.findUnique({
        where: { id: period.id },
        include: { entries: { include: { employee: true } } },
      });
    });
  }

  findPeriods(tenantId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { entries: true } },
        entries: { select: { total: true, isPaid: true } },
      },
    });
  }

  async getPeriod(tenantId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
      include: { entries: { include: { employee: true }, orderBy: { employee: { name: 'asc' } } } },
    });
    if (!period) throw new NotFoundException('Período no encontrado');
    return period;
  }

  async updateEntry(tenantId: string, entryId: string, dto: UpdatePayrollEntryDto) {
    const entry = await this.prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: { payrollPeriod: true },
    });
    if (!entry || entry.payrollPeriod.tenantId !== tenantId) throw new NotFoundException('Entrada no encontrada');
    if (entry.payrollPeriod.status === 'CERRADO') throw new BadRequestException('El período está cerrado');

    const extras = dto.extras ?? Number(entry.extras);
    const deductions = dto.deductions ?? Number(entry.deductions);
    const total = Number(entry.baseSalary) + extras - deductions;

    return this.prisma.payrollEntry.update({
      where: { id: entryId },
      data: { extras, deductions, total, notes: dto.notes },
      include: { employee: true },
    });
  }

  async markEntryPaid(tenantId: string, entryId: string, dto: MarkPaidDto) {
    const entry = await this.prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: { payrollPeriod: true },
    });
    if (!entry || entry.payrollPeriod.tenantId !== tenantId) throw new NotFoundException('Entrada no encontrada');
    return this.prisma.payrollEntry.update({
      where: { id: entryId },
      data: { isPaid: dto.isPaid, paidAt: dto.isPaid ? new Date() : null },
    });
  }

  async closePeriod(tenantId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Período no encontrado');
    if (period.status === 'CERRADO') throw new BadRequestException('El período ya está cerrado');
    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'CERRADO', closedAt: new Date() },
    });
  }
}
