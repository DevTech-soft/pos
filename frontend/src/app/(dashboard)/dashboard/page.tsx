'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Waves, Users, ShoppingCart, DollarSign, TrendingUp, Building2, CheckCircle, XCircle, Mail, ArrowRight } from 'lucide-react'
import type { Tenant } from '@/lib/types'

export default function DashboardPage() {
  const { user } = useAuthStore()

  if (user?.role === 'SUPERADMIN') return <SuperadminDashboard />

  return <TenantDashboard />
}

function SuperadminDashboard() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/tenants'),
  })

  const total = tenants.length
  const activas = tenants.filter(t => t.isActive).length
  const inactivas = total - activas

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#F3F6FA]">Dashboard</h1>
          <p className="text-[#7E8CA6] text-sm mt-1">Piscinas registradas en el sistema — {formatDate(new Date().toISOString())}</p>
        </div>
        <Link href="/tenants"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[14px] font-medium hover:bg-amber-500/30 transition-colors">
          Gestionar piscinas <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard icon={Building2} label="Total piscinas" value={total} color="amber" />
        <MetricCard icon={CheckCircle} label="Activas" value={activas} color="emerald" />
        <MetricCard icon={XCircle} label="Inactivas" value={inactivas} color="rose" />
      </div>

      <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
        <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-amber-400" />
          Piscinas
        </h2>

        {isLoading && <p className="text-[#7E8CA6] text-center py-6">Cargando piscinas...</p>}
        {!isLoading && tenants.length === 0 && <p className="text-[#7E8CA6] text-center py-6">No hay piscinas registradas todavía</p>}

        <div className="space-y-2.5">
          {tenants.map(t => {
            const admin = t.users?.[0]
            return (
              <div key={t.id} className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${t.isActive ? 'bg-[#1A2333] border-[#2A3650]' : 'bg-[#1A2333]/50 border-rose-500/20'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#F3F6FA] truncate">{t.name}</p>
                    <div className="flex items-center gap-2 text-[12px] text-[#7E8CA6] mt-0.5">
                      {admin ? (
                        <span className="flex items-center gap-1 truncate"><Mail size={11} className="flex-shrink-0" /> {admin.email}</span>
                      ) : (
                        <span className="text-rose-400">Sin admin asignado</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[12px] text-[#A7B3C7]">{t._count?.employees ?? 0} empleados</p>
                    <p className="text-[11px] text-[#7E8CA6]">Desde {formatDate(t.createdAt)}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${t.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                    {t.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {t.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TenantDashboard() {
  const { user } = useAuthStore()

  const { data: occupancy } = useQuery({
    queryKey: ['access-occupancy'],
    queryFn: () => api.get<{ count: number; entries: any[] }>('/access/occupancy'),
    refetchInterval: 30_000,
    enabled: !!user,
  })

  const { data: session } = useQuery({
    queryKey: ['cashier-active'],
    queryFn: () => api.get<any>('/cashier/active'),
    enabled: !!user,
  })

  const today = new Date().toISOString().split('T')[0]
  const { data: accessStats } = useQuery({
    queryKey: ['access-stats', today],
    queryFn: () => api.get<any>(`/access/stats?date=${today}`),
    enabled: !!user,
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-[#F3F6FA]">Dashboard</h1>
        <p className="text-[#7E8CA6] text-sm mt-1">
          {user?.tenant?.name ?? 'Pool Manager'} — {formatDate(new Date().toISOString())}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Waves}
          label="Aforo actual"
          value={occupancy?.count ?? 0}
          suffix="personas"
          color="sky"
        />
        <MetricCard
          icon={Users}
          label="Entradas hoy"
          value={accessStats?.totalPax ?? 0}
          suffix="personas"
          color="cyan"
        />
        <MetricCard
          icon={ShoppingCart}
          label="Ventas del día"
          value={session ? formatCurrency(Number(session.totalSales)) : '—'}
          color="emerald"
          isCurrency
        />
        <MetricCard
          icon={DollarSign}
          label="Estado caja"
          value={session ? 'Abierta' : 'Cerrada'}
          color={session ? 'emerald' : 'rose'}
        />
      </div>

      {/* Quick info */}
      {!session && (
        <div className="bg-[#121927] border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-amber-400 text-sm font-medium">No hay caja abierta. Ve a la sección Caja para abrir una sesión.</p>
          </div>
        </div>
      )}

      {occupancy && occupancy.count > 0 && (
        <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-sky-400" />
            Visitantes actualmente en la piscina
          </h2>
          <div className="space-y-2">
            {occupancy.entries.slice(0, 10).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-[#1A2333] rounded-xl">
                <div>
                  <p className="text-[14px] font-medium text-[#F3F6FA]">{e.visitorName ?? 'Visitante anónimo'}</p>
                  {e.pax > 1 && <p className="text-[12px] text-[#7E8CA6]">{e.pax} personas</p>}
                </div>
                <p className="text-[12px] text-[#7E8CA6]">
                  Entrada: {new Date(e.entryTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, suffix, color, isCurrency }: {
  icon: React.ElementType
  label: string
  value: string | number
  suffix?: string
  color: string
  isCurrency?: boolean
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20' },
    cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  }
  const c = colorMap[color] ?? colorMap.sky

  return (
    <div className={`bg-[#121927] border ${c.border} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] text-[#7E8CA6] font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon size={15} className={c.text} />
        </div>
      </div>
      <p className={`text-[26px] font-bold ${c.text} leading-none`}>{value}</p>
      {suffix && <p className="text-[12px] text-[#7E8CA6] mt-1">{suffix}</p>}
    </div>
  )
}
