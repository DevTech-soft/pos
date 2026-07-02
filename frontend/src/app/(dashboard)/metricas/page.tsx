'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, Receipt, Download, ShoppingCart, CalendarClock,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  MetricsSummary, MetricsTimeseriesPoint, PaymentMethodBreakdown, ExpenseBreakdownItem, TopProduct,
} from '@/lib/types'

// Paleta validada (WCAG + CVD) contra el fondo de tarjeta #121927 — ver skill dataviz.
// Cada métrica es una serie nominal de una sola dimensión: un color fijo por
// contexto (ingresos/egresos/tienda), identidad por eje/etiqueta, nunca una rampa.
const COLOR_INGRESOS = '#059669'
const COLOR_EGRESOS = '#f43f5e'
const COLOR_TIENDA = '#0284c7'

const inputCls = 'bg-[#1A2333] border border-[#2A3650] rounded-xl px-3 py-2 text-[13px] text-[#F3F6FA] outline-none focus:border-sky-500/50'

type Preset = 'hoy' | 'semana' | 'mes' | '30dias' | 'custom'

// El negocio opera en hora de Bogotá — anclamos ahí los rangos de fecha en vez
// de usar el huso del navegador/SO, que puede desalinear "hoy" o "este mes"
// cerca de la medianoche si el equipo no está configurado en esa zona.
const bogotaDateKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })

function bogotaToday(): Date {
  const [y, m, d] = bogotaDateKeyFormatter.format(new Date()).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)) // ancla de solo-calendario, no un instante real
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: Preset): { from: string; to: string } {
  const today = bogotaToday()
  const to = toISODate(today)
  if (preset === 'hoy') return { from: to, to }
  if (preset === 'semana') {
    const d = new Date(today)
    const day = (d.getUTCDay() + 6) % 7 // lunes=0
    d.setUTCDate(d.getUTCDate() - day)
    return { from: toISODate(d), to }
  }
  if (preset === 'mes') {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    return { from: toISODate(d), to }
  }
  // 30dias
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() - 29)
  return { from: toISODate(d), to }
}

function formatBucketLabel(dateStr: string, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'month') {
    const [y, m] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1))
  }
  return formatDate(dateStr)
}

function compactCurrency(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

function ChartTooltip({ active, payload, label, granularity }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A2333] border border-[#2A3650] rounded-xl px-3 py-2.5 shadow-2xl shadow-black/40">
      {label && (
        <p className="text-[11px] text-[#7E8CA6] mb-1.5">
          {granularity ? formatBucketLabel(label, granularity) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey ?? p.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-[3px] rounded-full flex-shrink-0" style={{ background: p.color ?? p.fill }} />
            <span className="text-[#A7B3C7]">{p.name}:</span>
            <span className="text-[#F3F6FA] font-semibold">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MetricasPage() {
  const [preset, setPreset] = useState<Preset>('mes')
  const [customFrom, setCustomFrom] = useState(() => { const d = bogotaToday(); d.setUTCDate(d.getUTCDate() - 29); return toISODate(d) })
  const [customTo, setCustomTo] = useState(() => toISODate(bogotaToday()))

  const { from, to } = preset === 'custom' ? { from: customFrom, to: customTo } : getPresetRange(preset)

  const spanDays = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1)
  const granularity: 'day' | 'week' | 'month' = spanDays <= 31 ? 'day' : spanDays <= 120 ? 'week' : 'month'

  const qs = `from=${from}&to=${to}`

  const { data: summary, isFetching: loadingSummary } = useQuery({
    queryKey: ['metrics-summary', from, to],
    queryFn: () => api.get<MetricsSummary>(`/metrics/summary?${qs}`),
  })

  const { data: timeseries = [] } = useQuery({
    queryKey: ['metrics-timeseries', from, to, granularity],
    queryFn: () => api.get<MetricsTimeseriesPoint[]>(`/metrics/timeseries?${qs}&granularity=${granularity}`),
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['metrics-payment-methods', from, to],
    queryFn: () => api.get<PaymentMethodBreakdown[]>(`/metrics/payment-methods?${qs}`),
  })

  const { data: expenseBreakdown = [] } = useQuery({
    queryKey: ['metrics-expense-breakdown', from, to],
    queryFn: () => api.get<ExpenseBreakdownItem[]>(`/metrics/expense-breakdown?${qs}`),
  })

  const { data: topProducts = [] } = useQuery({
    queryKey: ['metrics-top-products', from, to],
    queryFn: () => api.get<TopProduct[]>(`/metrics/top-products?${qs}&limit=10`),
  })

  const paymentMethodLabel = (m: string) => ({ EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', QR: 'QR' } as Record<string, string>)[m] ?? m

  const paymentChartData = useMemo(
    () => [...paymentMethods].sort((a, b) => b.total - a.total).map(p => ({ label: paymentMethodLabel(p.method), total: p.total })),
    [paymentMethods],
  )
  const expenseChartData = useMemo(
    () => [...expenseBreakdown].sort((a, b) => a.total - b.total).map(e => ({ label: e.label, total: e.total })),
    [expenseBreakdown],
  )
  const topProductsChartData = useMemo(
    () => [...topProducts].sort((a, b) => a.revenue - b.revenue).map(p => ({ label: `${p.productName} (${p.variantName})`, total: p.revenue })),
    [topProducts],
  )

  const [downloading, setDownloading] = useState(false)
  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await api.get<Blob>(`/metrics/report.pdf?${qs}`, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${from}-${to}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setDownloading(false)
    }
  }

  const neto = summary?.neto ?? 0

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#F3F6FA] flex items-center gap-3">
            <BarChart3 size={22} className="text-sky-400" />
            Métricas
          </h1>
          <p className="text-[#7E8CA6] text-sm mt-1">Ingresos, egresos y utilidad neta del negocio</p>
        </div>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[13px] font-medium hover:from-sky-400 hover:to-blue-500 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
        >
          <Download size={15} />
          {downloading ? 'Generando...' : 'Descargar reporte PDF'}
        </button>
      </div>

      {/* Filtro de rango — una sola fila, arriba de todo lo que afecta */}
      <div className="flex items-center gap-2 flex-wrap bg-[#121927] border border-[#2A3650] rounded-2xl p-3">
        {([
          ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['30dias', 'Últimos 30 días'],
        ] as [Preset, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${preset === key ? 'bg-sky-500/20 border border-sky-500/40 text-sky-400' : 'text-[#7E8CA6] hover:text-[#A7B3C7] border border-transparent'}`}
          >
            {label}
          </button>
        ))}
        <div className="w-px h-6 bg-[#2A3650] mx-1" />
        <div className="flex items-center gap-2">
          <CalendarClock size={14} className="text-[#7E8CA6]" />
          <input type="date" value={customFrom} max={customTo}
            onChange={e => { setCustomFrom(e.target.value); setPreset('custom') }}
            className={inputCls} />
          <span className="text-[#7E8CA6] text-[12px]">a</span>
          <input type="date" value={customTo} min={customFrom} max={toISODate(bogotaToday())}
            onChange={e => { setCustomTo(e.target.value); setPreset('custom') }}
            className={inputCls} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Ingresos totales" value={formatCurrency(summary?.ingresos.total ?? 0)} color="emerald" loading={loadingSummary} />
        <KpiCard icon={TrendingDown} label="Egresos totales" value={formatCurrency(summary?.egresos.total ?? 0)} color="rose" loading={loadingSummary} />
        <KpiCard icon={Wallet} label="Utilidad neta" value={formatCurrency(neto)} color={neto >= 0 ? 'emerald' : 'rose'} loading={loadingSummary} />
        <KpiCard icon={ShoppingCart} label="Ticket promedio tienda" value={formatCurrency(summary?.ticketPromedioTienda ?? 0)} color="sky" loading={loadingSummary} />
      </div>

      {/* Tendencia ingresos vs egresos */}
      <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
        <h2 className="text-[15px] font-semibold text-[#F3F6FA] mb-4">Ingresos vs. egresos</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={timeseries} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid stroke="#2A3650" vertical={false} />
            <XAxis dataKey="date" tickFormatter={d => formatBucketLabel(d, granularity)}
              stroke="#2A3650" tick={{ fill: '#7E8CA6', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2A3650' }} minTickGap={24} />
            <YAxis tickFormatter={compactCurrency} stroke="#2A3650" tick={{ fill: '#7E8CA6', fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip content={<ChartTooltip granularity={granularity} />} cursor={{ stroke: '#2A3650' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#A7B3C7' }} iconType="plainline" />
            <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={COLOR_INGRESOS} fill={COLOR_INGRESOS} fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="egresos" name="Egresos" stroke={COLOR_EGRESOS} fill={COLOR_EGRESOS} fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BreakdownBarCard title="Métodos de pago" icon={Wallet} data={paymentChartData} color={COLOR_INGRESOS} emptyLabel="Sin cobros en este rango" />
        <BreakdownBarCard title="Egresos por categoría" icon={Receipt} data={expenseChartData} color={COLOR_EGRESOS} emptyLabel="Sin egresos en este rango" />
      </div>

      <BreakdownBarCard title="Top productos vendidos" icon={ShoppingCart} data={topProductsChartData} color={COLOR_TIENDA} emptyLabel="Sin ventas de tienda en este rango" height={Math.max(220, topProductsChartData.length * 34)} />
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color, loading }: {
  icon: React.ElementType; label: string; value: string; color: 'emerald' | 'rose' | 'sky'; loading?: boolean
}) {
  const c = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  }[color]
  return (
    <div className={`bg-[#121927] border ${c.border} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] text-[#7E8CA6] font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={15} className={c.text} />
        </div>
      </div>
      <p className={`text-[22px] font-bold ${c.text} leading-none ${loading ? 'opacity-50' : ''}`}>{value}</p>
    </div>
  )
}

function BreakdownBarCard({ title, icon: Icon, data, color, emptyLabel, height = 220 }: {
  title: string; icon: React.ElementType; data: { label: string; total: number }[]; color: string; emptyLabel: string; height?: number
}) {
  return (
    <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
      <h2 className="text-[15px] font-semibold text-[#F3F6FA] mb-4 flex items-center gap-2">
        <Icon size={16} className="text-[#7E8CA6]" />
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-[#7E8CA6] text-sm text-center py-10">{emptyLabel}</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 0 }} barCategoryGap={10}>
            <CartesianGrid stroke="#2A3650" horizontal={false} />
            <XAxis type="number" tickFormatter={compactCurrency} stroke="#2A3650" tick={{ fill: '#7E8CA6', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" stroke="#2A3650" tick={{ fill: '#A7B3C7', fontSize: 12 }} tickLine={false} axisLine={false} width={160} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#1A2333' }} />
            <Bar dataKey="total" name="Total" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
