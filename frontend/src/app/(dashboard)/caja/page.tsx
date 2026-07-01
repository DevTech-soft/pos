'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Landmark, Lock, Unlock, DollarSign, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import type { CashierSession } from '@/lib/types'

export default function CajaPage() {
  const qc = useQueryClient()
  const [openAmount, setOpenAmount] = useState('')
  const [openNotes, setOpenNotes] = useState('')
  const [closeAmount, setCloseAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')

  const { data: session, isLoading } = useQuery({
    queryKey: ['cashier-active'],
    queryFn: () => api.get<CashierSession | null>('/cashier/active'),
  })

  const openCashier = useMutation({
    mutationFn: () => api.post('/cashier/open', { openingAmount: Number(openAmount), notes: openNotes || undefined }),
    onSuccess: () => { toast.success('Caja abierta'); qc.invalidateQueries({ queryKey: ['cashier-active'] }) },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const closeCashier = useMutation({
    mutationFn: () => api.patch(`/cashier/${session!.id}/close`, { closingAmount: Number(closeAmount), notes: closeNotes || undefined }),
    onSuccess: () => { toast.success('Caja cerrada'); qc.invalidateQueries({ queryKey: ['cashier-active'] }) },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const addExpense = useMutation({
    mutationFn: () => api.post(`/cashier/${session!.id}/expenses`, { description: expDesc, amount: Number(expAmount) }),
    onSuccess: () => { toast.success('Egreso registrado'); setExpDesc(''); setExpAmount(''); qc.invalidateQueries({ queryKey: ['cashier-active'] }) },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-[#4A5568]">Cargando...</p></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-[24px] font-bold text-[#EDF2F7] flex items-center gap-3">
        <Landmark size={22} className="text-sky-400" />
        Caja
      </h1>

      {!session ? (
        /* Open cashier */
        <div className="max-w-md bg-[#101520] border border-[#1C2535] rounded-2xl p-6 space-y-4">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] flex items-center gap-2">
            <Unlock size={16} className="text-emerald-400" /> Abrir caja
          </h2>
          <div>
            <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Monto inicial</label>
            <input type="number" value={openAmount} onChange={e => setOpenAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Notas (opcional)</label>
            <input value={openNotes} onChange={e => setOpenNotes(e.target.value)} placeholder="..."
              className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] outline-none focus:border-emerald-500/50" />
          </div>
          <button onClick={() => openCashier.mutate()} disabled={!openAmount || openCashier.isPending}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold text-[14px] disabled:opacity-40 hover:from-emerald-400 hover:to-green-500 transition-all">
            Abrir caja
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Session info */}
          <div className="space-y-4">
            <div className="bg-[#101520] border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-[#EDF2F7]">Caja abierta</h2>
                <span className="flex items-center gap-1.5 text-emerald-400 text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Activa
                </span>
              </div>
              <p className="text-[12px] text-[#4A5568] mb-4">Desde {formatDateTime(session.openedAt)}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Apertura', value: formatCurrency(Number(session.openingAmount)), color: 'text-[#EDF2F7]' },
                  { label: 'Ventas', value: formatCurrency(Number(session.totalSales)), color: 'text-emerald-400' },
                  { label: 'Egresos', value: formatCurrency(Number(session.totalExpenses)), color: 'text-rose-400' },
                  { label: 'Ingresos', value: formatCurrency(Number(session.totalIngresos)), color: 'text-sky-400' },
                ].map(m => (
                  <div key={m.label} className="bg-[#141B28] rounded-xl p-3">
                    <p className="text-[11px] text-[#4A5568]">{m.label}</p>
                    <p className={`text-[16px] font-bold ${m.color} mt-1`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add expense */}
            <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5 space-y-3">
              <h3 className="text-[14px] font-semibold text-[#EDF2F7] flex items-center gap-2">
                <TrendingDown size={14} className="text-rose-400" /> Registrar egreso de caja
              </h3>
              <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Descripción"
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[13px] text-[#EDF2F7] outline-none focus:border-rose-500/40" />
              <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="Monto"
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[13px] text-[#EDF2F7] outline-none focus:border-rose-500/40" />
              <button onClick={() => addExpense.mutate()} disabled={!expDesc || !expAmount || addExpense.isPending}
                className="w-full py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[13px] font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-40">
                Registrar egreso
              </button>
            </div>
          </div>

          {/* Close cashier */}
          <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5 space-y-4">
            <h2 className="text-[16px] font-semibold text-[#EDF2F7] flex items-center gap-2">
              <Lock size={16} className="text-rose-400" /> Cerrar caja
            </h2>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Monto final en caja</label>
              <input type="number" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} placeholder="0"
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] outline-none focus:border-rose-500/50" />
            </div>
            {closeAmount && (
              <div className="bg-[#141B28] rounded-xl p-3">
                <p className="text-[12px] text-[#4A5568]">Diferencia esperada</p>
                <p className={`text-[16px] font-bold mt-1 ${(Number(closeAmount) - (Number(session.openingAmount) + Number(session.totalSales) - Number(session.totalExpenses))) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(Number(closeAmount) - (Number(session.openingAmount) + Number(session.totalSales) - Number(session.totalExpenses)))}
                </p>
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Notas</label>
              <input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="..."
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] outline-none focus:border-rose-500/50" />
            </div>
            <button onClick={() => closeCashier.mutate()} disabled={!closeAmount || closeCashier.isPending}
              className="w-full py-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-[14px] hover:bg-rose-500/30 transition-colors disabled:opacity-40">
              Cerrar caja
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
