'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { useAuthStore } from '@/store/auth-store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, hydrate } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    hydrate()
    setHydrated(true)
  }, [hydrate])

  useEffect(() => {
    if (hydrated && !user) router.replace('/login')
  }, [hydrated, user, router])

  if (!hydrated || !user) return null

  return (
    <div className="flex h-screen bg-[#070A0F] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
