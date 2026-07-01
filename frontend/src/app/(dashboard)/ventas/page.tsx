'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { formatCurrency, formatDateTime, paymentMethodLabel } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'
import type { Sale } from '@/lib/types'

export default function VentasPage() {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get<Sale[]>('/store/sales'),
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-[24px] font-bold text-[#EDF2F7] flex items-center gap-3">
        <ClipboardList size={22} className="text-sky-400" />
        Cuaderno de ventas
      </h1>

      {isLoading && <p className="text-[#4A5568] text-center py-8">Cargando...</p>}
      {!isLoading && sales.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay ventas registradas</p>}

      <div className="space-y-3">
        {sales.map(sale => (
          <div key={sale.id} className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[14px] font-semibold text-[#EDF2F7]">
                  {sale.order.customerName ?? 'Cliente anónimo'}
                </p>
                <p className="text-[12px] text-[#4A5568] mt-0.5">{formatDateTime(sale.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-[18px] font-bold text-emerald-400">{formatCurrency(Number(sale.totalAmount))}</p>
                <span className="text-[11px] bg-[#141B28] border border-[#1C2535] rounded-lg px-2 py-0.5 text-[#8B96A8]">
                  {paymentMethodLabel(sale.paymentMethod)}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              {sale.order.items.map(item => (
                <div key={item.id} className="flex justify-between text-[13px]">
                  <span className="text-[#4A5568]">
                    {item.productVariant.product?.name} ({item.productVariant.name}) ×{item.quantity}
                  </span>
                  <span className="text-[#8B96A8]">{formatCurrency(Number(item.subtotal))}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
