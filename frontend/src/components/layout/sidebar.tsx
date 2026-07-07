'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutGrid, ShoppingCart, Landmark, ClipboardList,
  Receipt, LogOut, ChevronLeft, ChevronRight,
  Waves, Users, DollarSign, Building2, UserCheck, Package, CalendarClock, BarChart3,
} from 'lucide-react'
import { cn, rolLabel } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import type { Role } from '@/lib/types'

const NAV_ITEMS: {
  href: string
  label: string
  icon: React.ElementType
  roles: Role[]
  shortcut: string
  activeColor?: string
}[] = [
  { href: '/dashboard',     label: 'Dashboard',   icon: LayoutGrid,  roles: ['SUPERADMIN', 'ADMIN', 'CAJERO', 'EMPLEADO'], shortcut: 'Alt+1' },
  { href: '/acceso',        label: 'Control Acceso', icon: UserCheck, roles: ['ADMIN', 'CAJERO', 'EMPLEADO'],              shortcut: 'Alt+2', activeColor: 'cyan' },
  { href: '/alquiler',      label: 'Alquiler',     icon: CalendarClock, roles: ['ADMIN', 'CAJERO', 'EMPLEADO'],            shortcut: 'Alt+3', activeColor: 'violet' },
  { href: '/tienda',        label: 'Tienda',       icon: ShoppingCart, roles: ['ADMIN', 'CAJERO', 'EMPLEADO'],             shortcut: 'Alt+4' },
  { href: '/inventario',    label: 'Inventario',   icon: Package,     roles: ['ADMIN', 'SUPERADMIN'],          shortcut: 'Alt+5', activeColor: 'emerald' },
  { href: '/caja',          label: 'Caja',         icon: Landmark,    roles: ['ADMIN', 'CAJERO', 'EMPLEADO'],              shortcut: 'Alt+6' },
  { href: '/ventas',        label: 'Ventas',       icon: ClipboardList, roles: ['ADMIN', 'CAJERO', 'EMPLEADO'],            shortcut: 'Alt+7' },
  { href: '/metricas',      label: 'Métricas',     icon: BarChart3,   roles: ['ADMIN', 'SUPERADMIN'],          shortcut: 'Alt+8', activeColor: 'emerald' },
  { href: '/empleados',     label: 'Empleados',    icon: Users,       roles: ['ADMIN', 'SUPERADMIN'],          shortcut: 'Alt+9', activeColor: 'violet' },
  { href: '/nomina',        label: 'Nómina',       icon: DollarSign,  roles: ['ADMIN', 'SUPERADMIN'],          shortcut: 'Alt+0', activeColor: 'violet' },
  { href: '/gastos',        label: 'Gastos',       icon: Receipt,     roles: ['ADMIN'],                        shortcut: '', activeColor: 'rose' },
  { href: '/tenants',       label: 'Piscinas',     icon: Building2,   roles: ['SUPERADMIN'],                   shortcut: '', activeColor: 'amber' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, clearAuth } = useAuthStore()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored !== null) return stored === 'true'
      return window.innerWidth <= 1024
    }
    return false
  })

  const toggleCollapse = () => {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const handleLogout = () => {
    clearAuth()
    toast.success('Sesión cerrada')
    router.replace('/login')
  }

  const visibles = NAV_ITEMS.filter(
    (item) => !user?.role || item.roles.includes(user.role),
  )

  const colorMap: Record<string, string> = {
    cyan:   'text-cyan-400 bg-cyan-500/14 border-cyan-500/20',
    violet: 'text-violet-400 bg-violet-500/14 border-violet-500/20',
    rose:   'text-rose-400 bg-rose-500/14 border-rose-500/20',
    amber:  'text-amber-400 bg-amber-500/14 border-amber-500/20',
    emerald:'text-emerald-400 bg-emerald-500/14 border-emerald-500/20',
    default:'text-sky-400 bg-sky-500/14 border-sky-500/20',
  }
  const barMap: Record<string, string> = {
    cyan:   'bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-cyan-500/50',
    violet: 'bg-gradient-to-b from-violet-400 to-purple-500 shadow-violet-500/50',
    rose:   'bg-gradient-to-b from-rose-400 to-rose-600 shadow-rose-500/50',
    amber:  'bg-gradient-to-b from-amber-400 to-orange-500 shadow-amber-500/50',
    emerald:'bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-emerald-500/50',
    default:'bg-gradient-to-b from-sky-400 to-blue-500 shadow-sky-500/50',
  }

  const inicialUsuario = user?.name.charAt(0).toUpperCase() ?? '?'

  return (
    <>
      <div className="lg:hidden flex-shrink-0 w-[72px]" aria-hidden />

      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px]"
          onClick={toggleCollapse}
          aria-hidden
        />
      )}

      <aside className={cn(
        'flex flex-col h-screen z-40',
        'bg-[#0B0F17] border-r border-[#2A3650]',
        'transition-[width] duration-[250ms] ease-in-out overflow-hidden',
        'lg:sticky lg:top-0 lg:flex-shrink-0',
        'max-lg:fixed max-lg:inset-y-0 max-lg:left-0',
        collapsed ? 'w-[72px]' : 'w-[248px] max-lg:shadow-2xl max-lg:shadow-black/70',
      )}>
        {/* Logo */}
        <div className={cn(
          'h-[64px] flex items-center border-b border-[#2A3650] flex-shrink-0',
          collapsed ? 'justify-center px-4' : 'px-5 justify-between',
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
              <Waves size={17} className="text-white" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#F3F6FA] leading-none tracking-tight">POOL MANAGER</p>
                <p className="text-[11px] text-[#7E8CA6] mt-0.5 leading-none">
                  {user?.tenant?.name ?? 'Control de piscina'}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={toggleCollapse} className="w-7 h-7 flex items-center justify-center text-[#7E8CA6] hover:text-[#A7B3C7] transition-colors rounded-lg hover:bg-[#1A2333]">
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col py-4 gap-1 px-3 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-[#3C4A68] uppercase tracking-[0.15em] px-2 mb-2">
              Navegación
            </p>
          )}
          {visibles.map(({ href, label, icon: Icon, shortcut, activeColor }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const colorKey = activeColor ?? 'default'
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? `${label} (${shortcut})` : undefined}
                className={cn(
                  'relative group flex items-center rounded-xl transition-all duration-150 select-none',
                  collapsed ? 'h-11 w-11 mx-auto justify-center' : 'h-11 px-3 gap-3.5',
                  active ? cn('border', colorMap[colorKey]) : 'text-[#7E8CA6] hover:text-[#A7B3C7] hover:bg-[#1A2333]',
                )}
              >
                {active && !collapsed && (
                  <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full shadow-sm', barMap[colorKey])} />
                )}
                <Icon size={18} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-[14px] font-medium flex-1 leading-none">{label}</span>
                    <span className="text-[11px] flex-shrink-0 text-[#3C4A68] group-hover:text-[#3C4A68] leading-none">{shortcut}</span>
                  </>
                )}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 px-3 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap bg-[#1A2333] border border-[#2A3650] text-[#F3F6FA] shadow-2xl shadow-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                    {label}
                    <span className="ml-2 text-[#7E8CA6] text-[11px]">{shortcut}</span>
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#2A3650] py-4 px-3 space-y-2 flex-shrink-0">
          {collapsed && (
            <button onClick={toggleCollapse} className="w-11 h-11 mx-auto flex items-center justify-center text-[#7E8CA6] hover:text-[#A7B3C7] transition-colors rounded-xl hover:bg-[#1A2333]">
              <ChevronRight size={15} />
            </button>
          )}
          <div className={cn('flex items-center rounded-xl p-2 transition-colors hover:bg-[#1A2333]', collapsed ? 'justify-center' : 'gap-3')}>
            <div title={collapsed ? `${user?.name ?? ''} · ${user?.role ? rolLabel(user.role) : ''}` : undefined}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-default bg-gradient-to-br from-sky-400 to-blue-600 text-white text-[14px] font-bold shadow-md shadow-sky-500/25">
              {inicialUsuario}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#F3F6FA] truncate leading-tight">{user?.name}</p>
                <p className="text-[11px] text-[#7E8CA6] truncate mt-0.5">{user?.role ? rolLabel(user.role) : ''}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} title={collapsed ? 'Cerrar sesión' : undefined}
            className={cn('flex items-center rounded-xl text-[#7E8CA6] hover:text-rose-400 hover:bg-rose-500/14 transition-all border border-transparent hover:border-rose-500/15',
              collapsed ? 'w-11 h-11 mx-auto justify-center' : 'w-full h-10 px-3 gap-3')}>
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span className="text-[13px] font-medium">Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
