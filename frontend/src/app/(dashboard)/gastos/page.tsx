'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, Plus } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['SERVICIOS','NOMINA','MANTENIMIENTO','SUMINISTROS','OTRO','COBRO_DEUDA','PRESTAMO_RECIBIDO','OTRO_INGRESO']

export default function GastosPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'SERVICIOS', description: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'EGRESO', notes: '' })

  const { data: expenses = [] } = useQuery({
    queryKey: ['general-expenses'],
    queryFn: () => api.get<any[]>('/general-expenses'),
  })

  const create = useMutation({
    mutationFn: () => api.post('/general-expenses', { ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      toast.success('Gasto registrado')
      setShowForm(false)
      setForm({ category: 'SERVICIOS', description: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'EGRESO', notes: '' })
      qc.invalidateQueries({ queryKey: ['general-expenses'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const egresos = expenses.filter(e => e.type === 'EGRESO')
  const ingresos = expenses.filter(e => e.type !== 'EGRESO')

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-[#EDF2F7] flex items-center gap-3">
          <Receipt size={22} className="text-rose-400" /> Gastos generales
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[14px] font-medium hover:bg-rose-500/30">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {showForm && (
        <div className="bg-[#101520] border border-rose-500/20 rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Categoría</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Tipo</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none">
                <option value="EGRESO">Egreso</option>
                <option value="INGRESO">Ingreso</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Descripción</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="..."
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Monto</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0"
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#1C2535] text-[#4A5568]">Cancelar</button>
            <button onClick={() => create.mutate()} disabled={!form.description || !form.amount || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {expenses.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay registros</p>}
        {expenses.map(e => (
          <div key={e.id} className={`bg-[#101520] border rounded-2xl p-4 flex items-center justify-between ${e.type === 'EGRESO' ? 'border-[#1C2535]' : 'border-emerald-500/20'}`}>
            <div>
              <p className="text-[14px] font-medium text-[#EDF2F7]">{e.description}</p>
              <p className="text-[12px] text-[#4A5568] mt-0.5">{e.category} · {formatDate(e.date)}</p>
            </div>
            <p className={`text-[16px] font-bold ${e.type === 'EGRESO' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {e.type === 'EGRESO' ? '-' : '+'}{formatCurrency(Number(e.amount))}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
