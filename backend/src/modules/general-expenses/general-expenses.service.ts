import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGeneralExpenseDto } from './dto/general-expense.dto';

@Injectable()
export class GeneralExpensesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, month?: number, year?: number) {
    const where: any = { tenantId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      where.date = { gte: start, lte: end };
    }
    return this.prisma.generalExpense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { user: { select: { name: true } } },
    });
  }

  create(tenantId: string, userId: string, dto: CreateGeneralExpenseDto) {
    return this.prisma.generalExpense.create({
      data: { tenantId, createdBy: userId, ...dto, date: new Date(dto.date) },
    });
  }
}
