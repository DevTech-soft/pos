'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { Building2, Plus, CheckCircle, XCircle, MapPin, Phone, Mail, KeyRound, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Tenant } from '@/lib/types'

export default function TenantsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', adminName: '', adminEmail: '', adminPassword: '' })
  const [editingAdminOf, setEditingAdminOf] = useState<string | null>(null)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/tenants'),
  })

  const create = useMutation({
    mutationFn: () => api.post('/tenants', form),
    onSuccess: () => {
      toast.success('Piscina creada')
      setShowForm(false)
      setForm({ name: '', address: '', phone: '', email: '', adminName: '', adminEmail: '', adminPassword: '' })
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

  const updateAdmin = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Record<string, unknown> }) =>
      api.patch(`/users/${userId}`, data),
    onSuccess: () => {
      toast.success('Admin actualizado')
      setEditingAdminOf(null)
      qc.invalidateQueries({ queryKey: ['tenants'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const startEditAdmin = (t: Tenant) => {
    const admin = t.users?.[0]
    setAdminForm({ name: admin?.name ?? '', email: admin?.email ?? '', password: '' })
    setEditingAdminOf(t.id)
  }

  const saveAdmin = (t: Tenant) => {
    const admin = t.users?.[0]
    if (!admin) return
    const data: Record<string, unknown> = { name: adminForm.name, email: adminForm.email }
    if (adminForm.password) data.password = adminForm.password
    updateAdmin.mutate({ userId: admin.id, data })
  }

  const toggleAdminActive = (t: Tenant) => {
    const admin = t.users?.[0]
    if (!admin) return
    updateAdmin.mutate({ userId: admin.id, data: { isActive: !admin.isActive } })
  }

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

          <div className="mt-5 pt-4 border-t border-[#2A3650]">
            <h3 className="text-[13px] font-semibold text-[#F3F6FA] mb-3 flex items-center gap-2">
              <User size={14} className="text-amber-400" /> Administrador de la piscina
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'adminName', label: 'Nombre', placeholder: 'María Pérez' },
                { key: 'adminEmail', label: 'Email de acceso', placeholder: 'admin@piscina.com', type: 'email' },
                { key: 'adminPassword', label: 'Contraseña', placeholder: 'Mínimo 6 caracteres', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-2">{f.label}</label>
                  <input type={f.type ?? 'text'} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-[#1A2333] border border-[#2A3650] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-amber-500/50" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#2A3650] text-[#7E8CA6]">Cancelar</button>
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || !form.adminName || !form.adminEmail || form.adminPassword.length < 6 || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium hover:bg-amber-500/30 disabled:opacity-40">
              Crear
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map(t => {
          const admin = t.users?.[0]
          const isEditing = editingAdminOf === t.id
          return (
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

              <div className="mt-4 pt-3 border-t border-[#2A3650]">
                {!admin && <p className="text-[12px] text-rose-400">Sin admin asignado</p>}
                {admin && !isEditing && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#F3F6FA] flex items-center gap-1.5">
                        <User size={12} className="text-amber-400 flex-shrink-0" /> {admin.name}
                        {!admin.isActive && <span className="text-rose-400 text-[10px] font-bold uppercase">(inactivo)</span>}
                      </p>
                      <p className="text-[11px] text-[#7E8CA6] truncate">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleAdminActive(t)} title={admin.isActive ? 'Desactivar admin' : 'Activar admin'}
                        className="text-[#7E8CA6] hover:text-amber-400 transition-colors">
                        {admin.isActive ? <CheckCircle size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-rose-400" />}
                      </button>
                      <button onClick={() => startEditAdmin(t)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[11px] font-medium hover:bg-amber-500/25 transition-colors">
                        <KeyRound size={12} /> Editar
                      </button>
                    </div>
                  </div>
                )}
                {admin && isEditing && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-1.5">Nombre</label>
                      <input value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-[#1A2333] border border-[#2A3650] rounded-lg px-3 py-2 text-[13px] text-[#F3F6FA] outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-1.5">Email</label>
                      <input type="email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-[#1A2333] border border-[#2A3650] rounded-lg px-3 py-2 text-[13px] text-[#F3F6FA] outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-1.5">Nueva contraseña (opcional)</label>
                      <input type="password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Dejar vacío para no cambiarla"
                        className="w-full bg-[#1A2333] border border-[#2A3650] rounded-lg px-3 py-2 text-[13px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-amber-500/50" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingAdminOf(null)} className="flex-1 py-2 rounded-lg border border-[#2A3650] text-[#7E8CA6] text-[12px]">Cancelar</button>
                      <button onClick={() => saveAdmin(t)} disabled={!adminForm.name || !adminForm.email || updateAdmin.isPending}
                        className="flex-1 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[12px] font-medium hover:bg-amber-500/30 disabled:opacity-40">
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
