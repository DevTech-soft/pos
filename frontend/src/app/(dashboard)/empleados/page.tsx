'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Plus, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import type { Employee } from '@/lib/types'

export default function EmpleadosPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', baseSalary: '', phone: '', email: '', hiredAt: '' })

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/employees'),
  })

  const create = useMutation({
    mutationFn: () => api.post('/employees', { ...form, baseSalary: Number(form.baseSalary) }),
    onSuccess: () => {
      toast.success('Empleado registrado')
      setShowForm(false)
      setForm({ name: '', role: '', baseSalary: '', phone: '', email: '', hiredAt: '' })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const active = employees.filter(e => e.isActive)
  const inactive = employees.filter(e => !e.isActive)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-[#EDF2F7] flex items-center gap-3">
          <Users size={22} className="text-violet-400" />
          Empleados
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[14px] font-medium hover:bg-violet-500/30 transition-colors">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {showForm && (
        <div className="bg-[#101520] border border-violet-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4">Nuevo empleado</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Nombre completo', placeholder: 'Juan García', type: 'text' },
              { key: 'role', label: 'Cargo', placeholder: 'Salvavidas', type: 'text' },
              { key: 'baseSalary', label: 'Salario base', placeholder: '1200000', type: 'number' },
              { key: 'hiredAt', label: 'Fecha contratación', placeholder: '', type: 'date' },
              { key: 'phone', label: 'Teléfono (opcional)', placeholder: '3001234567', type: 'text' },
              { key: 'email', label: 'Email (opcional)', placeholder: 'juan@...', type: 'email' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] placeholder:text-[#2A3A52] outline-none focus:border-violet-500/50" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]">Cancelar</button>
            <button onClick={() => create.mutate()} disabled={!form.name || !form.role || !form.baseSalary || !form.hiredAt || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {active.map(emp => (
          <div key={emp.id} className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <span className="text-violet-400 font-bold text-[16px]">{emp.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#EDF2F7]">{emp.name}</p>
                <p className="text-[12px] text-[#4A5568]">{emp.role}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#4A5568]">Salario base</span>
                <span className="text-violet-400 font-medium">{formatCurrency(Number(emp.baseSalary))}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#4A5568]">Contratado</span>
                <span className="text-[#8B96A8]">{formatDate(emp.hiredAt)}</span>
              </div>
              {emp.phone && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#4A5568]">
                  <Phone size={11} /> {emp.phone}
                </div>
              )}
              {emp.email && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#4A5568]">
                  <Mail size={11} /> {emp.email}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isLoading && <p className="text-[#4A5568] text-center">Cargando empleados...</p>}
      {!isLoading && active.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay empleados registrados</p>}
    </div>
  )
}
