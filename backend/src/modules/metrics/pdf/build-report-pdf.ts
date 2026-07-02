import * as PdfMake from 'pdfmake';
import * as Helvetica from 'pdfmake/standard-fonts/Helvetica';
import type { MetricsService } from '../metrics.service';

// pdfmake no publica tipos TypeScript — se tipa localmente como `any` en los
// puntos de construcción del documento en vez de importar tipos inexistentes.
type Content = any;

type ReportData = Awaited<ReturnType<MetricsService['getFullReport']>>;

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const money = (n: number) => currency.format(n);
const dateLabel = (d: Date) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(d);

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
};

function summaryTable(data: ReportData['summary']): Content {
  return {
    table: {
      widths: ['*', 'auto'],
      body: [
        [{ text: 'Resumen ejecutivo', style: 'tableHeader', colSpan: 2 }, {}],
        ['Ingresos totales', { text: money(data.ingresos.total), alignment: 'right' }],
        ['Egresos totales', { text: money(data.egresos.total), alignment: 'right' }],
        [
          { text: 'Utilidad neta', bold: true },
          { text: money(data.neto), alignment: 'right', bold: true, color: data.neto >= 0 ? '#0F5132' : '#7C1D23' },
        ],
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 16],
  };
}

function breakdownTable(title: string, rows: [string, number][], total: number): Content {
  return {
    stack: [
      { text: title, style: 'sectionHeader' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            ...rows.map(([label, amount]) => [label, { text: money(amount), alignment: 'right' }]),
            [{ text: 'Total', bold: true }, { text: money(total), alignment: 'right', bold: true }],
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ],
    margin: [0, 0, 0, 16],
  };
}

export async function buildReportPdf(data: ReportData): Promise<Buffer> {
  const pdfMake: any = PdfMake;
  pdfMake.setFonts(Helvetica);
  // El documento se genera 100% desde datos internos (sin rutas ni URLs de usuario),
  // por eso se permite el acceso "local" que pdfmake exige para resolver la fuente estándar.
  pdfMake.setLocalAccessPolicy(() => true);
  pdfMake.setUrlAccessPolicy(() => false);

  const paymentRows: [string, number][] = data.paymentMethods.map(p => [PAYMENT_METHOD_LABELS[p.method] ?? p.method, p.total]);
  const expenseRows: [string, number][] = data.expenseBreakdown.map(e => [e.label, e.total]);

  const docDefinition: Content = {
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    pageMargins: [40, 60, 40, 50],
    header: {
      text: data.tenantName,
      alignment: 'left',
      margin: [40, 20, 40, 0],
      fontSize: 9,
      color: '#666666',
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Generado por Pool Manager el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())}`, fontSize: 8, color: '#999999' },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#999999' },
      ],
      margin: [40, 10, 40, 0],
    }),
    content: [
      { text: 'Reporte Financiero', style: 'title' },
      { text: `Del ${dateLabel(data.from)} al ${dateLabel(data.to)}`, style: 'subtitle', margin: [0, 0, 0, 20] },

      summaryTable(data.summary),

      breakdownTable(
        'Ingresos',
        [
          ['Tienda', data.summary.ingresos.tienda],
          ['Entradas', data.summary.ingresos.entradas],
          ['Alquiler', data.summary.ingresos.alquiler],
          ['Otros ingresos', data.summary.ingresos.otros],
        ],
        data.summary.ingresos.total,
      ),

      breakdownTable('Egresos', expenseRows, data.summary.egresos.total),

      paymentRows.length > 0 ? breakdownTable('Métodos de pago', paymentRows, paymentRows.reduce((a, [, v]) => a + v, 0)) : { text: '' },

      data.topProducts.length > 0
        ? {
            stack: [
              { text: 'Top productos vendidos', style: 'sectionHeader' },
              {
                table: {
                  widths: ['*', 'auto', 'auto'],
                  body: [
                    [{ text: 'Producto', bold: true }, { text: 'Cant.', bold: true, alignment: 'right' }, { text: 'Ingresos', bold: true, alignment: 'right' }],
                    ...data.topProducts.map(p => [
                      `${p.productName} (${p.variantName})`,
                      { text: String(p.quantity), alignment: 'right' },
                      { text: money(p.revenue), alignment: 'right' },
                    ]),
                  ],
                },
                layout: 'lightHorizontalLines',
              },
            ],
            margin: [0, 0, 0, 16],
          }
        : { text: '' },

      {
        text: `Ticket promedio tienda: ${money(data.summary.ticketPromedioTienda)}  ·  Ticket promedio entrada: ${money(data.summary.ticketPromedioEntrada)}  ·  Ventas: ${data.summary.countVentas}  ·  Entradas: ${data.summary.countEntradas}  ·  Alquileres: ${data.summary.countAlquileres}`,
        fontSize: 8,
        color: '#666666',
      },
    ],
    styles: {
      title: { fontSize: 20, bold: true },
      subtitle: { fontSize: 11, color: '#666666' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 4, 0, 6] },
      tableHeader: { fontSize: 11, bold: true },
    },
  };

  const doc = pdfMake.createPdf(docDefinition);
  return doc.getBuffer();
}
