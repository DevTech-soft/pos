'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatTime, formatCurrency } from '@/lib/utils'
import { UserCheck, UserPlus, LogOut, Users, Clock, RefreshCw, Settings, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth-store'
import type { AccessEntry, AccessPricing, CashierSession } from '@/lib/types'

const inputCls = 'w-full bg-[#1A2333] border border-[#2A3650] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-sky-500/50'
const labelCls = 'text-[11px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-2'

export default function AccesoPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManagePricing = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'

  const [visitorName, setVisitorName] = useState('')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [freeMinors, setFreeMinors] = useState(0)
  const [notes, setNotes] = useState('')
  const [payNow, setPayNow] = useState(true)
  const [payMethod, setPayMethod] = useState('EFECTIVO')
  const [amountPaid, setAmountPaid] = useState('')

  const [showPricing, setShowPricing] = useState(false)
  const [pricingForm, setPricingForm] = useState({ entryAdultPrice: '', entryChildPrice: '', entryFreeUnderAge: '' })

  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [settleMethod, setSettleMethod] = useState('EFECTIVO')
  const [settleAmountPaid, setSettleAmountPaid] = useState('')

  const { data: entries = [] } = useQuery({
    queryKey: ['access-today'],
    queryFn: () => api.get<AccessEntry[]>('/access/today'),
    refetchInterval: 15_000,
  })

  const { data: occupancy } = useQuery({
    queryKey: ['access-occupancy'],
    queryFn: () => api.get<{ count: number }>('/access/occupancy'),
    refetchInterval: 15_000,
  })

  const { data: pricing } = useQuery({
    queryKey: ['access-pricing'],
    queryFn: () => api.get<AccessPricing>('/access/pricing'),
  })

  const { data: session } = useQuery({
    queryKey: ['cashier-active'],
    queryFn: () => api.get<CashierSession | null>('/cashier/active'),
  })

  const { data: openTabs = [] } = useQuery({
    queryKey: ['access-open-tabs'],
    queryFn: () => api.get<AccessEntry[]>('/access/open-tabs'),
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (pricing) {
      setPricingForm({
        entryAdultPrice: String(pricing.entryAdultPrice),
        entryChildPrice: String(pricing.entryChildPrice),
        entryFreeUnderAge: String(pricing.entryFreeUnderAge),
      })
    }
  }, [pricing])

  const total = adults * (Number(pricing?.entryAdultPrice) || 0) + children * (Number(pricing?.entryChildPrice) || 0)

  const registerEntry = useMutation({
    mutationFn: () => api.post('/access/entry', {
      visitorName: visitorName || undefined,
      adults, children, freeMinors,
      notes: notes || undefined,
      ...(payNow ? { cashierSessionId: session!.id, paymentMethod: payMethod, amountPaid: Number(amountPaid) } : {}),
    }),
    onSuccess: () => {
      toast.success(payNow ? 'Entrada registrada' : 'Entrada registrada — cuenta abierta')
      setVisitorName(''); setAdults(1); setChildren(0); setFreeMinors(0); setNotes(''); setAmountPaid('')
      qc.invalidateQueries({ queryKey: ['access-today'] })
      qc.invalidateQueries({ queryKey: ['access-occupancy'] })
      qc.invalidateQueries({ queryKey: ['access-open-tabs'] })
      qc.invalidateQueries({ queryKey: ['cashier-active'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const registerExit = useMutation({
    mutationFn: (id: string) => api.patch(`/access/${id}/exit`, {}),
    onSuccess: () => {
      toast.success('Salida registrada')
      qc.invalidateQueries({ queryKey: ['access-today'] })
      qc.invalidateQueries({ queryKey: ['access-occupancy'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const updatePricing = useMutation({
    mutationFn: () => api.patch('/access/pricing', {
      entryAdultPrice: Number(pricingForm.entryAdultPrice),
      entryChildPrice: Number(pricingForm.entryChildPrice),
      entryFreeUnderAge: Number(pricingForm.entryFreeUnderAge),
    }),
    onSuccess: () => {
      toast.success('Tarifas actualizadas')
      setShowPricing(false)
      qc.invalidateQueries({ queryKey: ['access-pricing'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const settleTab = useMutation({
    mutationFn: (id: string) => api.post(`/access/${id}/settle`, {
      cashierSessionId: session!.id,
      paymentMethod: settleMethod,
      amountPaid: Number(settleAmountPaid),
    }),
    onSuccess: () => {
      toast.success('Cuenta cobrada y salida registrada')
      setSettlingId(null); setSettleAmountPaid('')
      qc.invalidateQueries({ queryKey: ['access-today'] })
      qc.invalidateQueries({ queryKey: ['access-occupancy'] })
      qc.invalidateQueries({ queryKey: ['access-open-tabs'] })
      qc.invalidateQueries({ queryKey: ['cashier-active'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const inside = entries.filter(e => !e.exitTime)
  const left    = entries.filter(e => e.exitTime)
  const pax = adults + children + freeMinors

  const tabById = new Map(openTabs.map(t => [t.id, t]))
  const openTab = (id: string) => tabById.get(id)
  const tabGrandTotal = (t: AccessEntry) => Number(t.totalAmount) + (t.orders ?? []).reduce((acc, o) => acc + Number(o.totalAmount), 0)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#F3F6FA]">Control de Acceso</h1>
          <p className="text-[#7E8CA6] text-sm mt-1">Registro de entradas y salidas del día</p>
        </div>
        <div className="flex items-center gap-3">
          {canManagePricing && (
            <button onClick={() => setShowPricing(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1A2333] border border-[#2A3650] text-[#A7B3C7] hover:text-cyan-400 hover:border-cyan-500/30 transition-colors text-[13px]">
              <Settings size={15} /> Tarifas
            </button>
          )}
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
            <Users size={16} className="text-sky-400" />
            <span className="text-sky-400 font-semibold">{occupancy?.count ?? 0} dentro</span>
          </div>
        </div>
      </div>

      {showPricing && canManagePricing && (
        <div className="bg-[#121927] border border-cyan-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4">Tarifas de entrada</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Precio adulto</label>
              <input type="number" className={inputCls} value={pricingForm.entryAdultPrice}
                onChange={e => setPricingForm(f => ({ ...f, entryAdultPrice: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Precio niño</label>
              <input type="number" className={inputCls} value={pricingForm.entryChildPrice}
                onChange={e => setPricingForm(f => ({ ...f, entryChildPrice: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Gratis para menores de (años)</label>
              <input type="number" className={inputCls} value={pricingForm.entryFreeUnderAge}
                onChange={e => setPricingForm(f => ({ ...f, entryFreeUnderAge: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowPricing(false)} className="flex-1 py-2.5 rounded-xl border border-[#2A3650] text-[#7E8CA6] hover:text-[#A7B3C7]">Cancelar</button>
            <button onClick={() => updatePricing.mutate()} disabled={updatePricing.isPending}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-sky-400" />
            Registrar entrada
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nombre (opcional)</label>
              <input
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                placeholder="Visitante anónimo"
                className={inputCls}
              />
            </div>

            {[
              { label: `Adultos (${formatCurrency(Number(pricing?.entryAdultPrice) || 0)} c/u)`, value: adults, set: setAdults, min: 0 },
              { label: `Niños (${formatCurrency(Number(pricing?.entryChildPrice) || 0)} c/u)`, value: children, set: setChildren, min: 0 },
              { label: `Menores de ${pricing?.entryFreeUnderAge ?? 4} años (gratis)`, value: freeMinors, set: setFreeMinors, min: 0 },
            ].map(row => (
              <div key={row.label}>
                <label className={labelCls}>{row.label}</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => row.set(v => Math.max(row.min, v - 1))}
                    className="w-10 h-10 rounded-xl bg-[#1A2333] border border-[#2A3650] text-[#F3F6FA] font-bold text-xl hover:border-sky-500/40 transition-colors">
                    -
                  </button>
                  <span className="text-[18px] font-bold text-[#F3F6FA] flex-1 text-center">{row.value}</span>
                  <button onClick={() => row.set(v => v + 1)}
                    className="w-10 h-10 rounded-xl bg-[#1A2333] border border-[#2A3650] text-[#F3F6FA] font-bold text-xl hover:border-sky-500/40 transition-colors">
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center bg-[#1A2333] rounded-xl p-3">
              <span className="text-[13px] text-[#7E8CA6]">Total de la entrada</span>
              <span className="text-[18px] font-bold text-sky-400">{formatCurrency(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPayNow(true)}
                className={`py-2.5 rounded-xl text-[12px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${payNow ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-[#1A2333] border-[#2A3650] text-[#7E8CA6] hover:text-[#A7B3C7]'}`}>
                <Wallet size={13} /> Pagar ahora
              </button>
              <button onClick={() => setPayNow(false)}
                className={`py-2.5 rounded-xl text-[12px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${!payNow ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#1A2333] border-[#2A3650] text-[#7E8CA6] hover:text-[#A7B3C7]'}`}>
                <Receipt size={13} /> Dejar cuenta abierta
              </button>
            </div>

            {payNow && (
              <>
                <div>
                  <label className={labelCls}>Método de pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR'].map(m => (
                      <button key={m} onClick={() => setPayMethod(m)}
                        className={`py-2 rounded-xl text-[12px] font-medium border transition-colors ${payMethod === m ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-[#1A2333] border-[#2A3650] text-[#7E8CA6] hover:text-[#A7B3C7]'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Monto recibido</label>
                  <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                    placeholder={String(total)} className={inputCls} />
                  {Number(amountPaid) >= total && total > 0 && (
                    <p className="text-emerald-400 text-[13px] mt-1">Cambio: {formatCurrency(Number(amountPaid) - total)}</p>
                  )}
                </div>
              </>
            )}

            {!payNow && (
              <p className="text-[12px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                Se registrará sin cobrar. Podrán pedir en la tienda cargándolo a su cuenta, y se cobra todo junto al salir.
              </p>
            )}

            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="..."
                className={inputCls}
              />
            </div>

            <button
              onClick={() => registerEntry.mutate()}
              disabled={pax < 1 || registerEntry.isPending || (payNow && (!session || !amountPaid || Number(amountPaid) < total))}
              className="w-full py-3.5 rounded-xl font-semibold text-[14px] bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <UserCheck size={16} />
              Registrar entrada
            </button>
            {payNow && !session && <p className="text-[11px] text-amber-400 text-center">Abre una caja primero</p>}
          </div>
        </div>

        {/* Inside */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
            <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4 flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              Dentro ahora ({inside.length})
            </h2>
            {inside.length === 0
              ? <p className="text-[#7E8CA6] text-sm text-center py-4">No hay visitantes dentro</p>
              : (
                <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                  {inside.map(e => {
                    const tab = e.paymentMethod == null ? openTab(e.id) : undefined
                    const grandTotal = tab ? tabGrandTotal(tab) : Number(e.totalAmount)
                    const isSettling = settlingId === e.id
                    return (
                      <div key={e.id} className="bg-[#1A2333] rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[14px] font-medium text-[#F3F6FA] flex items-center gap-2">
                              {e.visitorName ?? 'Anónimo'}
                              {tab && <span className="text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-md px-1.5 py-0.5">Cuenta abierta</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {e.pax > 1 && <span className="text-[12px] text-sky-400">{e.pax} personas</span>}
                              <span className="text-[12px] text-emerald-400">{formatCurrency(grandTotal)}</span>
                              <span className="text-[12px] text-[#7E8CA6] flex items-center gap-1">
                                <Clock size={11} /> {formatTime(e.entryTime)}
                              </span>
                            </div>
                          </div>
                          {tab ? (
                            <button
                              onClick={() => { setSettlingId(isSettling ? null : e.id); setSettleAmountPaid(String(grandTotal)) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium hover:bg-amber-500/20 transition-colors"
                            >
                              <Receipt size={13} />
                              Cobrar y salir
                            </button>
                          ) : (
                            <button
                              onClick={() => registerExit.mutate(e.id)}
                              disabled={registerExit.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[12px] font-medium hover:bg-rose-500/20 transition-colors"
                            >
                              <LogOut size={13} />
                              Salida
                            </button>
                          )}
                        </div>

                        {tab && (tab.orders?.length ?? 0) > 0 && (
                          <div className="mt-2 pt-2 border-t border-[#2A3650] space-y-1">
                            {tab.orders!.map(o => (
                              <div key={o.id} className="flex justify-between text-[12px]">
                                <span className="text-[#7E8CA6]">
                                  {o.items.map(i => `${i.productVariant.product?.name} (${i.productVariant.name}) ×${i.quantity}`).join(', ')}
                                </span>
                                <span className="text-[#A7B3C7]">{formatCurrency(Number(o.totalAmount))}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isSettling && tab && (
                          <div className="mt-3 pt-3 border-t border-[#2A3650] space-y-3">
                            <div className="grid grid-cols-4 gap-1.5">
                              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR'].map(m => (
                                <button key={m} onClick={() => setSettleMethod(m)}
                                  className={`py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${settleMethod === m ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#0B0F17] border-[#2A3650] text-[#7E8CA6]'}`}>
                                  {m}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="number" value={settleAmountPaid} onChange={ev => setSettleAmountPaid(ev.target.value)}
                                placeholder={String(grandTotal)}
                                className="flex-1 bg-[#0B0F17] border border-[#2A3650] rounded-lg px-3 py-2 text-[13px] text-[#F3F6FA] outline-none focus:border-amber-500/50" />
                              <button onClick={() => setSettlingId(null)} className="px-3 py-2 rounded-lg border border-[#2A3650] text-[#7E8CA6] text-[12px]">Cancelar</button>
                              <button onClick={() => settleTab.mutate(e.id)}
                                disabled={!session || !settleAmountPaid || Number(settleAmountPaid) < grandTotal || settleTab.isPending}
                                className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[12px] font-medium disabled:opacity-40">
                                Confirmar
                              </button>
                            </div>
                            {Number(settleAmountPaid) >= grandTotal && (
                              <p className="text-emerald-400 text-[12px]">Cambio: {formatCurrency(Number(settleAmountPaid) - grandTotal)}</p>
                            )}
                            {!session && <p className="text-[11px] text-amber-400">Abre una caja primero</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
            <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-[#7E8CA6]" />
              Salieron hoy ({left.length})
            </h2>
            {left.length === 0
              ? <p className="text-[#7E8CA6] text-sm text-center py-4">Ninguno aún</p>
              : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {left.slice(0, 20).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-[#1A2333] rounded-xl opacity-70">
                      <p className="text-[13px] text-[#A7B3C7]">
                        {e.visitorName ?? 'Anónimo'} {e.pax > 1 ? `(${e.pax})` : ''} · {formatCurrency(Number(e.amountPaid ?? e.totalAmount) - Number(e.change || 0))}
                      </p>
                      <div className="text-[12px] text-[#7E8CA6] flex gap-2">
                        <span>{formatTime(e.entryTime)}</span>
                        <span>→</span>
                        <span>{formatTime(e.exitTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
