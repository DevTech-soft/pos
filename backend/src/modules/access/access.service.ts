import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterEntryDto, RegisterExitDto } from './dto/access.dto';

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  async registerEntry(tenantId: string, dto: RegisterEntryDto) {
    return this.prisma.accessEntry.create({
      data: { tenantId, pax: dto.pax ?? 1, visitorName: dto.visitorName, notes: dto.notes },
    });
  }

  async registerExit(tenantId: string, entryId: string, dto: RegisterExitDto) {
    const entry = await this.prisma.accessEntry.findFirst({ where: { id: entryId, tenantId } });
    if (!entry) throw new NotFoundException('Entrada no encontrada');
    return this.prisma.accessEntry.update({
      where: { id: entryId },
      data: { exitTime: dto.exitTime ? new Date(dto.exitTime) : new Date() },
    });
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
    const withExit = entries.filter(e => e.exitTime);
    return { date, totalEntries: entries.length, totalPax, withExit: withExit.length, stillInside: entries.length - withExit.length };
  }
}
