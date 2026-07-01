'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, Plus, CheckCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { PayrollPeriod } from '@/lib/types'

export default function NominaPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ periodType: 'QUINCENAL', startDate: '', endDate: '' })

  const { data: periods = [] } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: () => api.get<PayrollPeriod[]>('/payroll/periods'),
  })

  const { data: currentPeriod } = useQuery({
    queryKey: ['payroll-period', expanded],
    queryFn: () => expanded ? api.get<PayrollPeriod>(`/payroll/periods/${expanded}`) : null,
    enabled: !!expanded,
  })

  const createPeriod = useMutation({
    mutationFn: () => api.post('/payroll/periods', form),
    onSuccess: () => {
      toast.success('Período de nómina creado')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const markPaid = useMutation({
    mutationFn: ({ entryId, isPaid }: { entryId: string; isPaid: boolean }) =>
      api.patch(`/payroll/entries/${entryId}/paid`, { isPaid }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-period', expanded] }) },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const closePeriod = useMutation({
    mutationFn: (periodId: string) => api.patch(`/payroll/periods/${periodId}/close`, {}),
    onSuccess: () => { toast.success('Período cerrado'); qc.invalidateQueries({ queryKey: ['payroll-periods'] }) },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-[#EDF2F7] flex items-center gap-3">
          <DollarSign size={22} className="text-violet-400" />
          Nómina
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[14px] font-medium hover:bg-violet-500/30 transition-colors">
          <Plus size={16} /> Nuevo período
        </button>
      </div>

      {showForm && (
        <div className="bg-[#101520] border border-violet-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4">Nuevo período de nómina</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Tipo</label>
              <select value={form.periodType} onChange={e => setForm(p => ({ ...p, periodType: e.target.value }))}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none">
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Desde</label>
              <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Hasta</label>
              <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#1C2535] text-[#4A5568]">Cancelar</button>
            <button onClick={() => createPeriod.mutate()} disabled={!form.startDate || !form.endDate || createPeriod.isPending}
              className="flex-1 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/30 disabled:opacity-40">
              Crear período
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {periods.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay períodos de nómina</p>}
        {periods.map(period => (
          <div key={period.id} className="bg-[#101520] border border-[#1C2535] rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === period.id ? null : period.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-[#141B28] transition-colors"
            >
              <div className="flex items-center gap-4">
                {expanded === period.id ? <ChevronDown size={16} className="text-[#4A5568]" /> : <ChevronRight size={16} className="text-[#4A5568]" />}
                <div className="text-left">
                  <p className="text-[15px] font-semibold text-[#EDF2F7]">
                    {period.periodType} — {formatDate(period.startDate)} → {formatDate(period.endDate)}
                  </p>
                  <p className="text-[12px] text-[#4A5568] mt-0.5">
                    {period.status === 'ABIERTO' ? '🟢 Abierto' : '🔒 Cerrado'}
                  </p>
                </div>
              </div>
              {period.status === 'ABIERTO' && (
                <button
                  onClick={e => { e.stopPropagation(); closePeriod.mutate(period.id) }}
                  className="px-3 py-1.5 rounded-lg bg-[#141B28] border border-[#1C2535] text-[#4A5568] text-[12px] hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                >
                  Cerrar
                </button>
              )}
            </button>

            {expanded === period.id && currentPeriod && (
              <div className="border-t border-[#1C2535] p-5">
                <div className="space-y-2">
                  {currentPeriod.entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-[#141B28] rounded-xl">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => markPaid.mutate({ entryId: entry.id, isPaid: !entry.isPaid })}
                          disabled={period.status === 'CERRADO' || markPaid.isPending}
                          className="text-[#4A5568] hover:text-violet-400 transition-colors disabled:cursor-default"
                        >
                          {entry.isPaid ? <CheckCircle size={18} className="text-emerald-400" /> : <Circle size={18} />}
                        </button>
                        <div>
                          <p className="text-[14px] font-medium text-[#EDF2F7]">{entry.employee.name}</p>
                          <p className="text-[12px] text-[#4A5568]">{entry.employee.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-bold text-violet-400">{formatCurrency(Number(entry.total))}</p>
                        <p className="text-[11px] text-[#4A5568]">
                          Base {formatCurrency(Number(entry.baseSalary))}
                          {Number(entry.extras) > 0 && ` +${formatCurrency(Number(entry.extras))}`}
                          {Number(entry.deductions) > 0 && ` -${formatCurrency(Number(entry.deductions))}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                    <span className="text-[14px] font-semibold text-[#EDF2F7]">Total nómina</span>
                    <span className="text-[16px] font-bold text-violet-400">
                      {formatCurrency(currentPeriod.entries.reduce((a, e) => a + Number(e.total), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
