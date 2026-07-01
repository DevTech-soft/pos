import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s
      gcTime: 5 * 60_000,      // 5 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

/* ─── Query keys centralizadas ───────────────────────────────── */
export const QUERY_KEYS = {
  mesas:      ['mesas']            as const,
  mesa:       (id: string) => ['mesas', id] as const,
  productos:  ['productos']        as const,
  producto:   (id: string) => ['productos', id] as const,
  categorias: ['categorias']       as const,
  pedidos:    ['pedidos']          as const,
  pedido:     (id: string) => ['pedidos', id] as const,
  insumos:    ['insumos']          as const,
  cajaActual: ['caja', 'actual']   as const,
  resumenCaja:(id: string) => ['caja', 'resumen', id] as const,
  dashboard:           ['dashboard']          as const,
  dashboardProductos:  ['dashboard', 'productos'] as const,
  ventas:     ['ventas']           as const,
  gastosSession:    (id: string) => ['gastos', 'session', id] as const,
  gastosGenerales:     (params?: string) => ['gastos-generales', params ?? ''] as const,
  resumenFinanciero:   (params?: string) => ['reports', 'financial', params ?? ''] as const,
  businessSetup:       ['business-setup'] as const,
  historialCaja:       ['caja', 'historial'] as const,
}
