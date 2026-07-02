'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { CalendarClock, CalendarPlus, Receipt, Wallet, Settings, XCircle, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Rental, RentalSpace, CashierSession } from '@/lib/types'

const inputCls = 'w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] placeholder:text-[#2A3A52] outline-none focus:border-violet-500/50'
const labelCls = 'text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2'

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AlquilerPage() {
  const qc = useQueryClient()

  const now = new Date()
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [startAt, setStartAt] = useState(toLocalInputValue(now))
  const [endAt, setEndAt] = useState(toLocalInputValue(in2h))
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [payNow, setPayNow] = useState(true)
  const [payMethod, setPayMethod] = useState('EFECTIVO')
  const [amountPaid, setAmountPaid] = useState('')

  const [showSpaces, setShowSpaces] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpacePrice, setNewSpacePrice] = useState('')

  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [settleMethod, setSettleMethod] = useState('EFECTIVO')
  const [settleAmountPaid, setSettleAmountPaid] = useState('')

  const { data: spaces = [] } = useQuery({
    queryKey: ['rental-spaces'],
    queryFn: () => api.get<RentalSpace[]>('/rentals/spaces'),
  })

  const { data: rentals = [] } = useQuery({
    queryKey: ['rentals'],
    queryFn: () => api.get<Rental[]>('/rentals'),
    refetchInterval: 15_000,
  })

  const { data: session } = useQuery({
    queryKey: ['cashier-active'],
    queryFn: () => api.get<CashierSession | null>('/cashier/active'),
  })

  const total = spaces.filter(s => selectedSpaceIds.includes(s.id)).reduce((acc, s) => acc + Number(s.price), 0)

  const toggleSpace = (id: string) => {
    setSelectedSpaceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const createRental = useMutation({
    mutationFn: () => api.post('/rentals', {
      customerName,
      phone: phone || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      spaceIds: selectedSpaceIds,
      notes: notes || undefined,
      ...(payNow ? { cashierSessionId: session!.id, paymentMethod: payMethod, amountPaid: Number(amountPaid) } : {}),
    }),
    onSuccess: () => {
      toast.success(payNow ? 'Reserva registrada' : 'Reserva registrada — cuenta abierta')
      setCustomerName(''); setPhone(''); setSelectedSpaceIds([]); setNotes(''); setAmountPaid('')
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['rental-open-tabs'] })
      qc.invalidateQueries({ queryKey: ['cashier-active'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const cancelRental = useMutation({
    mutationFn: (id: string) => api.post(`/rentals/${id}/cancel`),
    onSuccess: () => {
      toast.success('Reserva cancelada')
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['rental-open-tabs'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const completeRental = useMutation({
    mutationFn: (id: string) => api.post(`/rentals/${id}/complete`),
    onSuccess: () => {
      toast.success('Reserva marcada como completada')
      qc.invalidateQueries({ queryKey: ['rentals'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const settleRental = useMutation({
    mutationFn: (id: string) => api.post(`/rentals/${id}/settle`, {
      cashierSessionId: session!.id,
      paymentMethod: settleMethod,
      amountPaid: Number(settleAmountPaid),
    }),
    onSuccess: () => {
      toast.success('Cuenta cobrada y reserva finalizada')
      setSettlingId(null); setSettleAmountPaid('')
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['rental-open-tabs'] })
      qc.invalidateQueries({ queryKey: ['cashier-active'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const createSpace = useMutation({
    mutationFn: () => api.post('/rentals/spaces', { name: newSpaceName, price: Number(newSpacePrice) }),
    onSuccess: () => {
      toast.success('Espacio creado')
      setNewSpaceName(''); setNewSpacePrice('')
      qc.invalidateQueries({ queryKey: ['rental-spaces'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const updateSpace = useMutation({
    mutationFn: (vars: { id: string; data: Partial<Pick<RentalSpace, 'name' | 'price' | 'isActive'>> }) =>
      api.patch(`/rentals/spaces/${vars.id}`, vars.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-spaces'] }),
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const reservados = rentals
    .filter(r => r.status === 'RESERVADO')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const historial = rentals.filter(r => r.status !== 'RESERVADO').slice(0, 20)

  const grandTotal = (r: Rental) => Number(r.totalAmount) + (r.orders ?? []).filter(o => o.status === 'PENDIENTE').reduce((acc, o) => acc + Number(o.totalAmount), 0)

  const canCreate = customerName.trim().length > 0 && selectedSpaceIds.length > 0 && endAt > startAt &&
    (!payNow || (!!session && !!amountPaid && Number(amountPaid) >= total))

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#EDF2F7]">Alquiler de espacios</h1>
          <p className="text-[#4A5568] text-sm mt-1">Reservas de piscina, salones y demás espacios</p>
        </div>
        <button onClick={() => setShowSpaces(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#141B28] border border-[#1C2535] text-[#8B96A8] hover:text-violet-400 hover:border-violet-500/30 transition-colors text-[13px]">
          <Settings size={15} /> Espacios
        </button>
      </div>

      {showSpaces && (
        <div className="bg-[#101520] border border-violet-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4">Catálogo de espacios</h2>
          <div className="space-y-2 mb-4">
            {spaces.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-[#141B28] rounded-xl p-3">
                <input
                  value={s.name}
                  onChange={e => updateSpace.mutate({ id: s.id, data: { name: e.target.value } })}
                  className="flex-1 bg-transparent text-[14px] text-[#EDF2F7] outline-none"
                />
                <input
                  type="number"
                  value={s.price}
                  onChange={e => updateSpace.mutate({ id: s.id, data: { price: Number(e.target.value) } })}
                  className="w-32 bg-[#0C1018] border border-[#1C2535] rounded-lg px-2 py-1.5 text-[13px] text-[#EDF2F7] outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={() => updateSpace.mutate({ id: s.id, data: { isActive: !s.isActive } })}
                  className={`text-[11px] font-medium rounded-lg px-2.5 py-1.5 border transition-colors ${s.isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#0C1018] border-[#1C2535] text-[#4A5568]'}`}
                >
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            ))}
            {spaces.length === 0 && <p className="text-[#4A5568] text-sm text-center py-3">Sin espacios registrados</p>}
          </div>
          <div className="flex gap-2">
            <input value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} placeholder="Nombre del espacio"
              className={inputCls} />
            <input type="number" value={newSpacePrice} onChange={e => setNewSpacePrice(e.target.value)} placeholder="Precio"
              className={`${inputCls} w-40`} />
            <button
              onClick={() => createSpace.mutate()}
              disabled={!newSpaceName || !newSpacePrice || createSpace.isPending}
              className="px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4 flex items-center gap-2">
            <CalendarPlus size={16} className="text-violet-400" />
            Nueva reserva
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Cliente</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre del cliente" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono (opcional)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="..." className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Inicio</label>
                <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fin</label>
                <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={inputCls} />
              </div>
            </div>
            {endAt <= startAt && (
              <p className="text-[11px] text-rose-400">La hora de fin debe ser posterior a la de inicio</p>
            )}

            <div>
              <label className={labelCls}>Espacios</label>
              <div className="space-y-1.5">
                {spaces.filter(s => s.isActive).map(s => (
                  <label key={s.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border cursor-pointer transition-colors ${selectedSpaceIds.includes(s.id) ? 'bg-violet-500/15 border-violet-500/40' : 'bg-[#141B28] border-[#1C2535] hover:border-violet-500/20'}`}>
                    <span className="flex items-center gap-2 text-[13px] text-[#EDF2F7]">
                      <input type="checkbox" checked={selectedSpaceIds.includes(s.id)} onChange={() => toggleSpace(s.id)} className="accent-violet-500" />
                      {s.name}
                    </span>
                    <span className="text-[13px] font-medium text-violet-400">{formatCurrency(Number(s.price))}</span>
                  </label>
                ))}
                {spaces.filter(s => s.isActive).length === 0 && (
                  <p className="text-[#4A5568] text-sm text-center py-3">Crea un espacio primero</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center bg-[#141B28] rounded-xl p-3">
              <span className="text-[13px] text-[#4A5568]">Total de la reserva</span>
              <span className="text-[18px] font-bold text-violet-400">{formatCurrency(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPayNow(true)}
                className={`py-2.5 rounded-xl text-[12px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${payNow ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' : 'bg-[#141B28] border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]'}`}>
                <Wallet size={13} /> Pagar ahora
              </button>
              <button onClick={() => setPayNow(false)}
                className={`py-2.5 rounded-xl text-[12px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${!payNow ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#141B28] border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]'}`}>
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
                        className={`py-2 rounded-xl text-[12px] font-medium border transition-colors ${payMethod === m ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' : 'bg-[#141B28] border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]'}`}>
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
                Se registrará sin cobrar. Podrán pedir en la tienda cargándolo a su cuenta, y se cobra todo junto al finalizar.
              </p>
            )}

            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="..." className={inputCls} />
            </div>

            <button
              onClick={() => createRental.mutate()}
              disabled={!canCreate || createRental.isPending}
              className="w-full py-3.5 rounded-xl font-semibold text-[14px] bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <CalendarClock size={16} />
              Registrar reserva
            </button>
            {payNow && !session && <p className="text-[11px] text-amber-400 text-center">Abre una caja primero</p>}
          </div>
        </div>

        {/* Reservations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4 flex items-center gap-2">
              <CalendarClock size={16} className="text-violet-400" />
              Reservas activas ({reservados.length})
            </h2>
            {reservados.length === 0
              ? <p className="text-[#4A5568] text-sm text-center py-4">No hay reservas activas</p>
              : (
                <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                  {reservados.map(r => {
                    const isTab = r.paymentMethod == null
                    const total = grandTotal(r)
                    const isSettling = settlingId === r.id
                    const pendingOrders = (r.orders ?? []).filter(o => o.status === 'PENDIENTE')
                    return (
                      <div key={r.id} className="bg-[#141B28] rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[14px] font-medium text-[#EDF2F7] flex items-center gap-2">
                              {r.customerName}
                              {isTab && <span className="text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-md px-1.5 py-0.5">Cuenta abierta</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-[12px] text-violet-400">{r.items.map(i => i.space.name).join(', ')}</span>
                              <span className="text-[12px] text-emerald-400">{formatCurrency(total)}</span>
                              <span className="text-[12px] text-[#4A5568] flex items-center gap-1">
                                <Clock size={11} /> {formatDateTime(r.startAt)} → {formatDateTime(r.endAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isTab ? (
                              <>
                                <button
                                  onClick={() => cancelRental.mutate(r.id)}
                                  disabled={cancelRental.isPending}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0C1018] border border-[#1C2535] text-[#4A5568] hover:text-rose-400 text-[12px] font-medium transition-colors"
                                >
                                  <XCircle size={13} />
                                </button>
                                <button
                                  onClick={() => { setSettlingId(isSettling ? null : r.id); setSettleAmountPaid(String(total)) }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium hover:bg-amber-500/20 transition-colors"
                                >
                                  <Receipt size={13} />
                                  Cobrar y finalizar
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => completeRental.mutate(r.id)}
                                disabled={completeRental.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-medium hover:bg-emerald-500/20 transition-colors"
                              >
                                <CheckCircle2 size={13} />
                                Completar
                              </button>
                            )}
                          </div>
                        </div>

                        {isTab && pendingOrders.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[#1C2535] space-y-1">
                            {pendingOrders.map(o => (
                              <div key={o.id} className="flex justify-between text-[12px]">
                                <span className="text-[#4A5568]">
                                  {o.items.map(i => `${i.productVariant.product?.name} (${i.productVariant.name}) ×${i.quantity}`).join(', ')}
                                </span>
                                <span className="text-[#8B96A8]">{formatCurrency(Number(o.totalAmount))}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isSettling && isTab && (
                          <div className="mt-3 pt-3 border-t border-[#1C2535] space-y-3">
                            <div className="grid grid-cols-4 gap-1.5">
                              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR'].map(m => (
                                <button key={m} onClick={() => setSettleMethod(m)}
                                  className={`py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${settleMethod === m ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#0C1018] border-[#1C2535] text-[#4A5568]'}`}>
                                  {m}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="number" value={settleAmountPaid} onChange={ev => setSettleAmountPaid(ev.target.value)}
                                placeholder={String(total)}
                                className="flex-1 bg-[#0C1018] border border-[#1C2535] rounded-lg px-3 py-2 text-[13px] text-[#EDF2F7] outline-none focus:border-amber-500/50" />
                              <button onClick={() => setSettlingId(null)} className="px-3 py-2 rounded-lg border border-[#1C2535] text-[#4A5568] text-[12px]">Cancelar</button>
                              <button onClick={() => settleRental.mutate(r.id)}
                                disabled={!session || !settleAmountPaid || Number(settleAmountPaid) < total || settleRental.isPending}
                                className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[12px] font-medium disabled:opacity-40">
                                Confirmar
                              </button>
                            </div>
                            {Number(settleAmountPaid) >= total && (
                              <p className="text-emerald-400 text-[12px]">Cambio: {formatCurrency(Number(settleAmountPaid) - total)}</p>
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

          <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4 flex items-center gap-2">
              <CalendarClock size={16} className="text-[#4A5568]" />
              Historial ({historial.length})
            </h2>
            {historial.length === 0
              ? <p className="text-[#4A5568] text-sm text-center py-4">Sin reservas finalizadas o canceladas</p>
              : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {historial.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-[#141B28] rounded-xl opacity-70">
                      <p className="text-[13px] text-[#8B96A8] flex items-center gap-2">
                        {r.customerName} · {r.items.map(i => i.space.name).join(', ')} · {formatCurrency(Number(r.totalAmount))}
                        <span className={`text-[10px] rounded-md px-1.5 py-0.5 border ${r.status === 'CANCELADO' ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
                          {r.status === 'CANCELADO' ? 'Cancelada' : 'Completada'}
                        </span>
                      </p>
                      <span className="text-[12px] text-[#4A5568]">{formatDateTime(r.startAt)}</span>
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
