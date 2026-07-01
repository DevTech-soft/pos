'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatTime } from '@/lib/utils'
import { UserCheck, UserPlus, LogOut, Users, Clock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { AccessEntry } from '@/lib/types'

export default function AccesoPage() {
  const qc = useQueryClient()
  const [visitorName, setVisitorName] = useState('')
  const [pax, setPax] = useState(1)
  const [notes, setNotes] = useState('')

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['access-today'],
    queryFn: () => api.get<AccessEntry[]>('/access/today'),
    refetchInterval: 15_000,
  })

  const { data: occupancy } = useQuery({
    queryKey: ['access-occupancy'],
    queryFn: () => api.get<{ count: number }>('/access/occupancy'),
    refetchInterval: 15_000,
  })

  const registerEntry = useMutation({
    mutationFn: () => api.post('/access/entry', { visitorName: visitorName || undefined, pax, notes: notes || undefined }),
    onSuccess: () => {
      toast.success('Entrada registrada')
      setVisitorName(''); setPax(1); setNotes('')
      qc.invalidateQueries({ queryKey: ['access-today'] })
      qc.invalidateQueries({ queryKey: ['access-occupancy'] })
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

  const inside = entries.filter(e => !e.exitTime)
  const left    = entries.filter(e => e.exitTime)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#EDF2F7]">Control de Acceso</h1>
          <p className="text-[#4A5568] text-sm mt-1">Registro de entradas y salidas del día</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
            <Users size={16} className="text-sky-400" />
            <span className="text-sky-400 font-semibold">{occupancy?.count ?? 0} dentro</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-sky-400" />
            Registrar entrada
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">
                Nombre (opcional)
              </label>
              <input
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                placeholder="Visitante anónimo"
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] placeholder:text-[#2A3A52] outline-none focus:border-sky-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">
                Personas
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setPax(v => Math.max(1, v - 1))}
                  className="w-10 h-10 rounded-xl bg-[#141B28] border border-[#1C2535] text-[#EDF2F7] font-bold text-xl hover:border-sky-500/40 transition-colors">
                  -
                </button>
                <span className="text-[20px] font-bold text-[#EDF2F7] flex-1 text-center">{pax}</span>
                <button onClick={() => setPax(v => v + 1)}
                  className="w-10 h-10 rounded-xl bg-[#141B28] border border-[#1C2535] text-[#EDF2F7] font-bold text-xl hover:border-sky-500/40 transition-colors">
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">
                Notas (opcional)
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="..."
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] placeholder:text-[#2A3A52] outline-none focus:border-sky-500/50"
              />
            </div>
            <button
              onClick={() => registerEntry.mutate()}
              disabled={registerEntry.isPending}
              className="w-full py-3.5 rounded-xl font-semibold text-[14px] bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <UserCheck size={16} />
              Registrar entrada
            </button>
          </div>
        </div>

        {/* Inside */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4 flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              Dentro ahora ({inside.length})
            </h2>
            {inside.length === 0
              ? <p className="text-[#4A5568] text-sm text-center py-4">No hay visitantes dentro</p>
              : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {inside.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-[#141B28] rounded-xl">
                      <div>
                        <p className="text-[14px] font-medium text-[#EDF2F7]">{e.visitorName ?? 'Anónimo'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {e.pax > 1 && <span className="text-[12px] text-sky-400">{e.pax} personas</span>}
                          <span className="text-[12px] text-[#4A5568] flex items-center gap-1">
                            <Clock size={11} /> {formatTime(e.entryTime)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => registerExit.mutate(e.id)}
                        disabled={registerExit.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[12px] font-medium hover:bg-rose-500/20 transition-colors"
                      >
                        <LogOut size={13} />
                        Salida
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          <div className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-[#4A5568]" />
              Salieron hoy ({left.length})
            </h2>
            {left.length === 0
              ? <p className="text-[#4A5568] text-sm text-center py-4">Ninguno aún</p>
              : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {left.slice(0, 20).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-[#141B28] rounded-xl opacity-70">
                      <p className="text-[13px] text-[#8B96A8]">{e.visitorName ?? 'Anónimo'} {e.pax > 1 ? `(${e.pax})` : ''}</p>
                      <div className="text-[12px] text-[#4A5568] flex gap-2">
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
