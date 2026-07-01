'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Waves, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { User } from '@/lib/types'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const login = useMutation({
    mutationFn: (data: LoginFormData) =>
      api.post<{ access_token: string; user: User }>('/auth/login', data),
    onSuccess: ({ access_token, user }) => {
      setAuth(user, access_token)
      toast.success(`Bienvenido, ${user.name}`)
      router.replace('/dashboard')
    },
    onError: (err) => toast.error(getAxiosErrorMessage(err)),
  })

  const fillDemo = (email: string, password: string) => {
    setValue('email', email)
    setValue('password', password)
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-[#0E1521] border border-[#1C2535] rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
        {/* Header */}
        <div
          className="relative px-8 pt-10 pb-8 flex flex-col items-center gap-4 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #001520 0%, #0F1520 60%, #0C1018 100%)',
            borderBottom: '1px solid #1C2535',
          }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 opacity-40 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.3) 0%, transparent 70%)' }}
          />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-sky-500/40">
              <Waves size={30} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-sky-500/25" />
          </div>
          <div className="text-center relative">
            <h1 className="text-[26px] font-bold text-[#EDF2F7] tracking-tight">Pool Manager</h1>
            <p className="text-[14px] text-[#4A5568] mt-1">Sistema de gestión de piscina</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block">
                Correo electrónico
              </label>
              <div className="relative group">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A5568] group-focus-within:text-sky-400 transition-colors pointer-events-none" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@piscina.com"
                  autoComplete="email"
                  className={cn(
                    'w-full bg-[#141B28] border rounded-xl pl-10 pr-4 py-3.5 text-[14px] text-[#EDF2F7]',
                    'placeholder:text-[#2A3A52] outline-none transition-all',
                    'focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.08)]',
                    errors.email ? 'border-rose-500/60' : 'border-[#1C2535]',
                  )}
                />
              </div>
              {errors.email && <p className="text-rose-400 text-[12px]">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block">
                Contraseña
              </label>
              <div className="relative group">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A5568] group-focus-within:text-sky-400 transition-colors pointer-events-none" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    'w-full bg-[#141B28] border rounded-xl pl-10 pr-11 py-3.5 text-[14px] text-[#EDF2F7]',
                    'placeholder:text-[#2A3A52] outline-none transition-all',
                    'focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.08)]',
                    errors.password ? 'border-rose-500/60' : 'border-[#1C2535]',
                  )}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A5568] hover:text-[#8B96A8] transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-400 text-[12px]">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3.5 mt-2 rounded-xl font-semibold text-[14px] bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {login.isPending
                ? <><Loader2 size={16} className="animate-spin" /> Iniciando sesión...</>
                : 'Ingresar al sistema'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7 pt-6 border-t border-[#1C2535]">
            <p className="text-[11px] text-[#2A3A52] text-center mb-3 uppercase tracking-[0.15em] font-semibold">
              Cuentas de demostración
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { rol: 'SuperAdmin', email: 'superadmin@poolmanager.com', password: 'superadmin123', color: 'text-amber-400 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5' },
                { rol: 'Admin',      email: 'admin@piscinaelparaiso.com', password: 'admin123',      color: 'text-sky-400 border-sky-500/20 hover:border-sky-500/40 hover:bg-sky-500/5' },
                { rol: 'Cajero',     email: 'cajero@piscinaelparaiso.com', password: 'cajero123',    color: 'text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5' },
              ].map((u) => (
                <button key={u.rol} type="button" onClick={() => fillDemo(u.email, u.password)}
                  className={cn('bg-[#141B28] border rounded-xl p-3 text-center transition-all', u.color)}>
                  <p className="text-[12px] font-bold">{u.rol}</p>
                  <p className="text-[10px] text-[#2A3A52] mt-1 break-all leading-tight">{u.email.split('@')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-[#2A3A52] mt-5">Pool Manager © 2025 — Sistema de gestión de piscina</p>
    </div>
  )
}
