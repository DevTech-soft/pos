import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeneralExpenseCategory, PaymentMethod } from '@prisma/client';

const INCOME_EXPENSE_CATEGORIES: GeneralExpenseCategory[] = ['COBRO_DEUDA', 'PRESTAMO_RECIBIDO', 'OTRO_INGRESO'];

const EXPENSE_CATEGORY_LABELS: Record<GeneralExpenseCategory, string> = {
  SERVICIOS: 'Servicios',
  NOMINA: 'Nómina (gasto general)',
  MANTENIMIENTO: 'Mantenimiento',
  SUMINISTROS: 'Suministros',
  OTRO: 'Otro',
  COBRO_DEUDA: 'Cobro de deuda',
  PRESTAMO_RECIBIDO: 'Préstamo recibido',
  OTRO_INGRESO: 'Otro ingreso',
};

// Colombia no usa horario de verano — offset fijo. Todo el rango se ancla a
// este huso (igual que formatDate/formatTime en el frontend) en vez de mezclar
// parseo UTC con setHours() en la zona del servidor, que en producción (Railway,
// UTC) desalinea el corte del día real de Bogotá y puede excluir movimientos del
// mismo día registrados después de cierta hora.
const BOGOTA_TZ = 'America/Bogota';
const BOGOTA_OFFSET = '-05:00';
const bogotaDateKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

function parseRange(from: string, to: string): { from: Date; to: Date } {
  const fromDate = new Date(`${from}T00:00:00.000${BOGOTA_OFFSET}`);
  const toDate = new Date(`${to}T23:59:59.999${BOGOTA_OFFSET}`);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) throw new BadRequestException('Rango de fechas inválido');
  if (toDate < fromDate) throw new BadRequestException('"to" debe ser posterior a "from"');
  return { from: fromDate, to: toDate };
}

// Día calendario real en Bogotá para un timestamp de la base de datos (UTC).
function toBogotaDateKey(date: Date): string {
  return bogotaDateKeyFormatter.format(date);
}

function mondayOf(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const anchor = new Date(Date.UTC(y, m - 1, d));
  const dow = (anchor.getUTCDay() + 6) % 7; // lunes=0
  anchor.setUTCDate(anchor.getUTCDate() - dow);
  return { y: anchor.getUTCFullYear(), m: anchor.getUTCMonth() + 1, d: anchor.getUTCDate() };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function bucketKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
  const [y, m, d] = toBogotaDateKey(date).split('-').map(Number);
  if (granularity === 'month') return `${y}-${pad(m)}`;
  if (granularity === 'day') return `${y}-${pad(m)}-${pad(d)}`;
  const monday = mondayOf(y, m, d);
  return `${monday.y}-${pad(monday.m)}-${pad(monday.d)}`;
}

// Itera puramente sobre año-mes-día (nunca vuelve a pasar por Date+zona horaria)
// para que las claves generadas coincidan exacto con las que produce bucketKey().
function enumerateBuckets(fromStr: string, toStr: string, granularity: 'day' | 'week' | 'month'): string[] {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  const keys: string[] = [];
  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const d = cursor.getUTCDate();
    const key = granularity === 'month'
      ? `${y}-${pad(m)}`
      : granularity === 'week'
        ? (() => { const monday = mondayOf(y, m, d); return `${monday.y}-${pad(monday.m)}-${pad(monday.d)}`; })()
        : `${y}-${pad(m)}-${pad(d)}`;
    if (keys[keys.length - 1] !== key) keys.push(key);
    if (granularity === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else if (granularity === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  private async fetchRange(tenantId: string, from: Date, to: Date) {
    const [sales, accessEntries, rentals, generalExpenses, cashExpenses, payrollEntries, purchaseOrders] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, createdAt: { gte: from, lte: to } },
        include: { order: { include: { items: { include: { productVariant: { include: { product: true } } } } } } },
      }),
      this.prisma.accessEntry.findMany({
        where: {
          tenantId,
          paymentMethod: { not: null },
          entryTime: { lte: to },
          OR: [
            { exitTime: { gte: from, lte: to } },
            { exitTime: null, entryTime: { gte: from } },
          ],
        },
      }),
      this.prisma.rental.findMany({
        where: { tenantId, paymentMethod: { not: null }, paidAt: { gte: from, lte: to } },
      }),
      this.prisma.generalExpense.findMany({ where: { tenantId, date: { gte: from, lte: to } } }),
      this.prisma.cashExpense.findMany({ where: { tenantId, createdAt: { gte: from, lte: to } } }),
      this.prisma.payrollEntry.findMany({
        where: { isPaid: true, paidAt: { gte: from, lte: to }, payrollPeriod: { tenantId } },
      }),
      this.prisma.purchaseOrder.findMany({ where: { tenantId, status: 'RECIBIDA', receivedAt: { gte: from, lte: to } } }),
    ]);

    // Fecha "efectiva" de cada entrada pagada: la salida si se liquidó una cuenta abierta, si no la propia entrada.
    const accessEntriesWithDate = accessEntries.map(e => ({ ...e, effectiveDate: e.exitTime ?? e.entryTime }));

    return { sales, accessEntries: accessEntriesWithDate, rentals, generalExpenses, cashExpenses, payrollEntries, purchaseOrders };
  }

  async getSummary(tenantId: string, fromStr: string, toStr: string) {
    const { from, to } = parseRange(fromStr, toStr);
    const data = await this.fetchRange(tenantId, from, to);
    return this.computeSummary(data);
  }

  private computeSummary(data: Awaited<ReturnType<MetricsService['fetchRange']>>) {
    const tienda = data.sales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const entradas = data.accessEntries.reduce((acc, e) => acc + Number(e.totalAmount), 0);
    const alquiler = data.rentals.reduce((acc, r) => acc + Number(r.totalAmount), 0);
    const otrosIngresos = data.generalExpenses
      .filter(g => INCOME_EXPENSE_CATEGORIES.includes(g.category))
      .reduce((acc, g) => acc + Number(g.amount), 0);
    const totalIngresos = tienda + entradas + alquiler + otrosIngresos;

    const generales = data.generalExpenses
      .filter(g => !INCOME_EXPENSE_CATEGORIES.includes(g.category))
      .reduce((acc, g) => acc + Number(g.amount), 0);
    const caja = data.cashExpenses.reduce((acc, c) => acc + Number(c.totalAmount), 0);
    const nomina = data.payrollEntries.reduce((acc, p) => acc + Number(p.total), 0);
    const compras = data.purchaseOrders.reduce((acc, p) => acc + Number(p.totalAmount), 0);
    const totalEgresos = generales + caja + nomina + compras;

    return {
      ingresos: { tienda, entradas, alquiler, otros: otrosIngresos, total: totalIngresos },
      egresos: { generales, caja, nomina, compras, total: totalEgresos },
      neto: totalIngresos - totalEgresos,
      ticketPromedioTienda: data.sales.length ? tienda / data.sales.length : 0,
      ticketPromedioEntrada: data.accessEntries.length ? entradas / data.accessEntries.length : 0,
      countVentas: data.sales.length,
      countEntradas: data.accessEntries.length,
      countAlquileres: data.rentals.length,
    };
  }

  async getTimeseries(tenantId: string, fromStr: string, toStr: string, granularity: 'day' | 'week' | 'month' = 'day') {
    const { from, to } = parseRange(fromStr, toStr);
    const data = await this.fetchRange(tenantId, from, to);

    const buckets = new Map<string, { ingresos: number; egresos: number }>();
    for (const key of enumerateBuckets(fromStr, toStr, granularity)) buckets.set(key, { ingresos: 0, egresos: 0 });

    const addIngreso = (date: Date, amount: number) => {
      const key = bucketKey(date, granularity);
      const b = buckets.get(key) ?? { ingresos: 0, egresos: 0 };
      b.ingresos += amount;
      buckets.set(key, b);
    };
    const addEgreso = (date: Date, amount: number) => {
      const key = bucketKey(date, granularity);
      const b = buckets.get(key) ?? { ingresos: 0, egresos: 0 };
      b.egresos += amount;
      buckets.set(key, b);
    };

    data.sales.forEach(s => addIngreso(s.createdAt, Number(s.totalAmount)));
    data.accessEntries.forEach(e => addIngreso(e.effectiveDate, Number(e.totalAmount)));
    data.rentals.forEach(r => addIngreso(r.paidAt!, Number(r.totalAmount)));
    data.generalExpenses.forEach(g => {
      if (INCOME_EXPENSE_CATEGORIES.includes(g.category)) addIngreso(g.date, Number(g.amount));
      else addEgreso(g.date, Number(g.amount));
    });
    data.cashExpenses.forEach(c => addEgreso(c.createdAt, Number(c.totalAmount)));
    data.payrollEntries.forEach(p => addEgreso(p.paidAt!, Number(p.total)));
    data.purchaseOrders.forEach(p => addEgreso(p.receivedAt!, Number(p.totalAmount)));

    return [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, ingresos: v.ingresos, egresos: v.egresos }));
  }

  async getPaymentMethods(tenantId: string, fromStr: string, toStr: string) {
    const { from, to } = parseRange(fromStr, toStr);
    const data = await this.fetchRange(tenantId, from, to);
    return this.computePaymentMethods(data);
  }

  private computePaymentMethods(data: Awaited<ReturnType<MetricsService['fetchRange']>>) {
    const totals = new Map<PaymentMethod, number>();
    const add = (method: PaymentMethod | null, amount: number) => {
      if (!method) return;
      totals.set(method, (totals.get(method) ?? 0) + amount);
    };
    data.sales.forEach(s => add(s.paymentMethod, Number(s.totalAmount)));
    data.accessEntries.forEach(e => add(e.paymentMethod, Number(e.totalAmount)));
    data.rentals.forEach(r => add(r.paymentMethod, Number(r.totalAmount)));

    return [...totals.entries()].map(([method, total]) => ({ method, total }));
  }

  async getExpenseBreakdown(tenantId: string, fromStr: string, toStr: string) {
    const { from, to } = parseRange(fromStr, toStr);
    const data = await this.fetchRange(tenantId, from, to);
    return this.computeExpenseBreakdown(data);
  }

  private computeExpenseBreakdown(data: Awaited<ReturnType<MetricsService['fetchRange']>>) {
    const totals = new Map<string, number>();
    const add = (label: string, amount: number) => totals.set(label, (totals.get(label) ?? 0) + amount);

    data.generalExpenses
      .filter(g => !INCOME_EXPENSE_CATEGORIES.includes(g.category))
      .forEach(g => add(EXPENSE_CATEGORY_LABELS[g.category], Number(g.amount)));
    const cajaTotal = data.cashExpenses.reduce((acc, c) => acc + Number(c.totalAmount), 0);
    if (cajaTotal > 0) add('Gastos de caja', cajaTotal);
    const nominaTotal = data.payrollEntries.reduce((acc, p) => acc + Number(p.total), 0);
    if (nominaTotal > 0) add('Nómina (planilla)', nominaTotal);
    const comprasTotal = data.purchaseOrders.reduce((acc, p) => acc + Number(p.totalAmount), 0);
    if (comprasTotal > 0) add('Compras a proveedores', comprasTotal);

    return [...totals.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }

  async getTopProducts(tenantId: string, fromStr: string, toStr: string, limit = 10) {
    const { from, to } = parseRange(fromStr, toStr);
    const data = await this.fetchRange(tenantId, from, to);
    return this.computeTopProducts(data, limit);
  }

  private computeTopProducts(data: Awaited<ReturnType<MetricsService['fetchRange']>>, limit: number) {
    const totals = new Map<string, { productName: string; variantName: string; quantity: number; revenue: number }>();
    for (const sale of data.sales) {
      for (const item of sale.order.items) {
        const key = item.productVariantId;
        const entry = totals.get(key) ?? {
          productName: item.productVariant.product?.name ?? 'Producto',
          variantName: item.productVariant.name,
          quantity: 0,
          revenue: 0,
        };
        entry.quantity += item.quantity;
        entry.revenue += Number(item.subtotal);
        totals.set(key, entry);
      }
    }

    return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }

  async getFullReport(tenantId: string, fromStr: string, toStr: string) {
    const { from, to } = parseRange(fromStr, toStr);
    const [data, tenant] = await Promise.all([
      this.fetchRange(tenantId, from, to),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    return {
      from,
      to,
      tenantName: tenant?.name ?? 'Pool Manager',
      summary: this.computeSummary(data),
      paymentMethods: this.computePaymentMethods(data),
      expenseBreakdown: this.computeExpenseBreakdown(data),
      topProducts: this.computeTopProducts(data, 10),
    };
  }
}
