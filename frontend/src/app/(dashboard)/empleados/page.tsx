'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDate, rolLabel } from '@/lib/utils'
import { Users, Plus, Phone, Mail, KeyRound, CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { Employee } from '@/lib/types'

const ACCESS_ROLES: { value: 'CAJERO' | 'EMPLEADO'; label: string }[] = [
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'EMPLEADO', label: 'Empleado' },
]

export default function EmpleadosPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', role: '', baseSalary: '', phone: '', email: '', hiredAt: '',
    grantAccess: false, password: '', accessRole: 'CAJERO' as 'CAJERO' | 'EMPLEADO',
  })
  const [accessPanelFor, setAccessPanelFor] = useState<string | null>(null)
  const [accessForm, setAccessForm] = useState({ password: '', accessRole: 'CAJERO' as 'CAJERO' | 'EMPLEADO' })

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/employees'),
  })

  const create = useMutation({
    mutationFn: () => api.post('/employees', { ...form, baseSalary: Number(form.baseSalary) }),
    onSuccess: () => {
      toast.success('Empleado registrado')
      setShowForm(false)
      setForm({ name: '', role: '', baseSalary: '', phone: '', email: '', hiredAt: '', grantAccess: false, password: '', accessRole: 'CAJERO' })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const updateAccess = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/employees/${id}`, data),
    onSuccess: () => {
      toast.success('Acceso actualizado')
      setAccessPanelFor(null)
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const openAccessPanel = (emp: Employee) => {
    setAccessForm({ password: '', accessRole: (emp.user?.role as 'CAJERO' | 'EMPLEADO') ?? 'CAJERO' })
    setAccessPanelFor(emp.id)
  }

  const saveAccess = (emp: Employee) => {
    if (emp.user) {
      const data: Record<string, unknown> = { accessRole: accessForm.accessRole }
      if (accessForm.password) data.password = accessForm.password
      updateAccess.mutate({ id: emp.id, data })
    } else {
      if (!emp.email) { toast.error('Agrega un email de contacto al empleado antes de dar acceso'); return }
      if (accessForm.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
      updateAccess.mutate({ id: emp.id, data: { grantAccess: true, password: accessForm.password, accessRole: accessForm.accessRole } })
    }
  }

  const toggleAccessActive = (emp: Employee) => {
    if (!emp.user) return
    updateAccess.mutate({ id: emp.id, data: { revokeAccess: emp.user.isActive } })
  }

  const active = employees.filter(e => e.isActive)
  const inactive = employees.filter(e => !e.isActive)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-[#F3F6FA] flex items-center gap-3">
          <Users size={22} className="text-violet-400" />
          Empleados
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[14px] font-medium hover:bg-violet-500/30 transition-colors">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {showForm && (
        <div className="bg-[#121927] border border-violet-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#F3F6FA] mb-4">Nuevo empleado</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Nombre completo', placeholder: 'Juan García', type: 'text' },
              { key: 'role', label: 'Cargo', placeholder: 'Salvavidas', type: 'text' },
              { key: 'baseSalary', label: 'Salario base', placeholder: '1200000', type: 'number' },
              { key: 'hiredAt', label: 'Fecha contratación', placeholder: '', type: 'date' },
              { key: 'phone', label: 'Teléfono (opcional)', placeholder: '3001234567', type: 'text' },
              { key: 'email', label: form.grantAccess ? 'Email (usuario de acceso)' : 'Email (opcional)', placeholder: 'juan@...', type: 'email' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-2">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#1A2333] border border-[#2A3650] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-violet-500/50" />
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#2A3650]">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.grantAccess}
                onChange={e => setForm(prev => ({ ...prev, grantAccess: e.target.checked }))}
                className="w-4 h-4 rounded accent-violet-500" />
              <span className="text-[13px] font-medium text-[#F3F6FA] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-violet-400" /> Dar acceso al sistema
              </span>
            </label>

            {form.grantAccess && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-[11px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-2">Rol de acceso</label>
                  <select value={form.accessRole} onChange={e => setForm(prev => ({ ...prev, accessRole: e.target.value as 'CAJERO' | 'EMPLEADO' }))}
                    className="w-full bg-[#1A2333] border border-[#2A3650] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F6FA] outline-none focus:border-violet-500/50">
                    {ACCESS_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-2">Contraseña</label>
                  <input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#1A2333] border border-[#2A3650] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-violet-500/50" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#2A3650] text-[#7E8CA6] hover:text-[#A7B3C7]">Cancelar</button>
            <button
              onClick={() => create.mutate()}
              disabled={
                !form.name || !form.role || !form.baseSalary || !form.hiredAt || create.isPending ||
                (form.grantAccess && (!form.email || form.password.length < 6))
              }
              className="flex-1 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {active.map(emp => (
          <div key={emp.id} className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <span className="text-violet-400 font-bold text-[16px]">{emp.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#F3F6FA]">{emp.name}</p>
                <p className="text-[12px] text-[#7E8CA6]">{emp.role}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#7E8CA6]">Salario base</span>
                <span className="text-violet-400 font-medium">{formatCurrency(Number(emp.baseSalary))}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#7E8CA6]">Contratado</span>
                <span className="text-[#A7B3C7]">{formatDate(emp.hiredAt)}</span>
              </div>
              {emp.phone && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#7E8CA6]">
                  <Phone size={11} /> {emp.phone}
                </div>
              )}
              {emp.email && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#7E8CA6]">
                  <Mail size={11} /> {emp.email}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#2A3650]">
              {accessPanelFor !== emp.id && (
                <>
                  {emp.user ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-violet-400" />
                        <span className="text-[#F3F6FA]">{rolLabel(emp.user.role)}</span>
                        {!emp.user.isActive && <span className="text-rose-400 text-[10px] font-bold uppercase">(inactivo)</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleAccessActive(emp)} title={emp.user.isActive ? 'Desactivar acceso' : 'Activar acceso'}
                          className="text-[#7E8CA6] hover:text-violet-400 transition-colors">
                          {emp.user.isActive ? <CheckCircle size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-rose-400" />}
                        </button>
                        <button onClick={() => openAccessPanel(emp)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[11px] font-medium hover:bg-violet-500/25 transition-colors">
                          <KeyRound size={12} /> Resetear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => openAccessPanel(emp)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[12px] font-medium hover:bg-violet-500/25 transition-colors">
                      <ShieldCheck size={13} /> Dar acceso al sistema
                    </button>
                  )}
                </>
              )}

              {accessPanelFor === emp.id && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-1.5">Rol de acceso</label>
                    <select value={accessForm.accessRole} onChange={e => setAccessForm(p => ({ ...p, accessRole: e.target.value as 'CAJERO' | 'EMPLEADO' }))}
                      className="w-full bg-[#1A2333] border border-[#2A3650] rounded-lg px-3 py-2 text-[13px] text-[#F3F6FA] outline-none focus:border-violet-500/50">
                      {ACCESS_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7E8CA6] uppercase tracking-[0.15em] block mb-1.5">
                      {emp.user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    </label>
                    <input type="password" value={accessForm.password} onChange={e => setAccessForm(p => ({ ...p, password: e.target.value }))}
                      placeholder={emp.user ? 'Dejar vacío para no cambiarla' : 'Mínimo 6 caracteres'}
                      className="w-full bg-[#1A2333] border border-[#2A3650] rounded-lg px-3 py-2 text-[13px] text-[#F3F6FA] placeholder:text-[#3C4A68] outline-none focus:border-violet-500/50" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAccessPanelFor(null)} className="flex-1 py-2 rounded-lg border border-[#2A3650] text-[#7E8CA6] text-[12px]">Cancelar</button>
                    <button onClick={() => saveAccess(emp)} disabled={updateAccess.isPending}
                      className="flex-1 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[12px] font-medium hover:bg-violet-500/30 disabled:opacity-40">
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isLoading && <p className="text-[#7E8CA6] text-center">Cargando empleados...</p>}
      {!isLoading && active.length === 0 && <p className="text-[#7E8CA6] text-center py-8">No hay empleados registrados</p>}
    </div>
  )
}
