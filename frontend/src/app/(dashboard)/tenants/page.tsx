'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { Building2, Plus, CheckCircle, XCircle, MapPin, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import type { Tenant } from '@/lib/types'

export default function TenantsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/tenants'),
  })

  const create = useMutation({
    mutationFn: () => api.post('/tenants', form),
    onSuccess: () => {
      toast.success('Piscina creada')
      setShowForm(false)
      setForm({ name: '', address: '', phone: '', email: '' })
      qc.invalidateQueries({ queryKey: ['tenants'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/tenants/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-[#F3F6FA] flex items-center gap-3">
          <Building2 size={22} className="text-amber-400" />
          Piscinas (Tenants)
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[14px] font-medium hover:bg-amber-500/30 transition-colors">
          <Plus size={16} /> Nueva piscina
        </button>
      </div>

      {showForm && (
        <div className="bg-[#121927] border border-amber-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4">Registrar piscina</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Nombre', placeholder: 'Piscina El Paraíso' },
              { key: 'address', label: 'Dirección', placeholder: 'Calle 10 # 5-20' },
              { key: 'phone', label: 'Teléfono', placeholder: '3001234567' },
              { key: 'email', label: 'Email', placeholder: 'info@piscina.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-2">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#1A2333] border border-[#2A3650] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-amber-500/50" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#2A3650] text-[#7E8CA6]">Cancelar</button>
            <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium hover:bg-amber-500/30 disabled:opacity-40">
              Crear
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map(t => (
          <div key={t.id} className={`bg-[#121927] border rounded-2xl p-5 ${t.isActive ? 'border-[#2A3650]' : 'border-rose-500/20 opacity-70'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Building2 size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#F3F6FA]">{t.name}</p>
                  <p className="text-[11px] text-[#7E8CA6] mt-0.5">{t.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={() => toggle.mutate({ id: t.id, isActive: !t.isActive })}
                className="text-[#7E8CA6] hover:text-amber-400 transition-colors"
                title={t.isActive ? 'Desactivar' : 'Activar'}
              >
                {t.isActive ? <CheckCircle size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-rose-400" />}
              </button>
            </div>
            <div className="space-y-1.5 text-[13px]">
              {t.address && <p className="text-[#7E8CA6] flex items-center gap-1.5"><MapPin size={13} className="flex-shrink-0" /> {t.address}</p>}
              {t.phone && <p className="text-[#7E8CA6] flex items-center gap-1.5"><Phone size={13} className="flex-shrink-0" /> {t.phone}</p>}
              {t.email && <p className="text-[#7E8CA6] flex items-center gap-1.5"><Mail size={13} className="flex-shrink-0" /> {t.email}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
