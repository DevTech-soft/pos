'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { formatCurrency, formatDateTime, paymentMethodLabel } from '@/lib/utils'
import { ClipboardList, UserCheck, CalendarClock } from 'lucide-react'
import type { Sale, AccessEntry, Rental } from '@/lib/types'

type Row =
  | { kind: 'store'; at: string; sale: Sale }
  | { kind: 'entry'; at: string; entry: AccessEntry }
  | { kind: 'rental'; at: string; rental: Rental }

export default function VentasPage() {
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get<Sale[]>('/store/sales'),
  })

  const { data: paidEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['access-sales'],
    queryFn: () => api.get<AccessEntry[]>('/access/sales'),
  })

  const { data: paidRentals = [], isLoading: loadingRentals } = useQuery({
    queryKey: ['rental-sales'],
    queryFn: () => api.get<Rental[]>('/rentals/sales'),
  })

  const isLoading = loadingSales || loadingEntries || loadingRentals

  // Los pedidos cargados a una cuenta (entrada o alquiler) ya se muestran dentro
  // de la tarjeta de esa cuenta (más abajo), así que se excluyen aquí para no duplicarlos.
  const rows: Row[] = [
    ...sales
      .filter(s => !s.order.accessEntryId && !s.order.rentalId)
      .map(s => ({ kind: 'store' as const, at: s.createdAt, sale: s })),
    ...paidEntries.map(e => ({ kind: 'entry' as const, at: e.paidAt ?? e.entryTime, entry: e })),
    ...paidRentals.map(r => ({ kind: 'rental' as const, at: r.paidAt ?? r.createdAt, rental: r })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-[24px] font-bold text-[#F3F6FA] flex items-center gap-3">
        <ClipboardList size={22} className="text-sky-400" />
        Cuaderno de ventas
      </h1>

      {isLoading && <p className="text-[#7E8CA6] text-center py-8">Cargando...</p>}
      {!isLoading && rows.length === 0 && <p className="text-[#7E8CA6] text-center py-8">No hay ventas registradas</p>}

      <div className="space-y-3">
        {rows.map(row => {
          if (row.kind === 'store') return <StoreSaleCard key={`s-${row.sale.id}`} sale={row.sale} />
          if (row.kind === 'entry') return <EntrySaleCard key={`e-${row.entry.id}`} entry={row.entry} />
          return <RentalSaleCard key={`r-${row.rental.id}`} rental={row.rental} />
        })}
      </div>
    </div>
  )
}

function StoreSaleCard({ sale }: { sale: Sale }) {
  return (
    <div className="bg-[#121927] border border-[#2A3650] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[14px] font-semibold text-[#F3F6FA]">
            {sale.order.customerName ?? 'Cliente anónimo'}
          </p>
          <p className="text-[12px] text-[#7E8CA6] mt-0.5">{formatDateTime(sale.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold text-emerald-400">{formatCurrency(Number(sale.totalAmount))}</p>
          <span className="text-[11px] bg-[#1A2333] border border-[#2A3650] rounded-lg px-2 py-0.5 text-[#A7B3C7]">
            {paymentMethodLabel(sale.paymentMethod)}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        {sale.order.items.map(item => (
          <div key={item.id} className="flex justify-between text-[13px]">
            <span className="text-[#7E8CA6]">
              {item.productVariant.product?.name} ({item.productVariant.name}) ×{item.quantity}
            </span>
            <span className="text-[#A7B3C7]">{formatCurrency(Number(item.subtotal))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EntrySaleCard({ entry }: { entry: AccessEntry }) {
  const orders = entry.orders ?? []
  const ordersTotal = orders.reduce((acc, o) => acc + Number(o.totalAmount), 0)
  const grandTotal = Number(entry.totalAmount) + ordersTotal
  const paxParts = [
    `${entry.adults} adulto${entry.adults !== 1 ? 's' : ''}`,
    entry.children > 0 ? `${entry.children} niño${entry.children !== 1 ? 's' : ''}` : null,
    entry.freeMinors > 0 ? `${entry.freeMinors} gratis` : null,
  ].filter(Boolean).join(', ')

  return (
    <div className="bg-[#121927] border border-cyan-500/20 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[14px] font-semibold text-[#F3F6FA] flex items-center gap-2">
            <UserCheck size={14} className="text-cyan-400" />
            {entry.visitorName ?? 'Anónimo'}
          </p>
          <p className="text-[12px] text-[#7E8CA6] mt-0.5">{formatDateTime(entry.paidAt ?? entry.entryTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold text-emerald-400">{formatCurrency(grandTotal)}</p>
          {entry.paymentMethod && (
            <span className="text-[11px] bg-[#1A2333] border border-[#2A3650] rounded-lg px-2 py-0.5 text-[#A7B3C7]">
              {paymentMethodLabel(entry.paymentMethod)}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[13px]">
          <span className="text-[#7E8CA6]">Entrada piscina ({paxParts})</span>
          <span className="text-[#A7B3C7]">{formatCurrency(Number(entry.totalAmount))}</span>
        </div>
        {orders.flatMap(o => o.items).map(item => (
          <div key={item.id} className="flex justify-between text-[13px]">
            <span className="text-[#7E8CA6]">
              {item.productVariant.product?.name} ({item.productVariant.name}) ×{item.quantity}
            </span>
            <span className="text-[#A7B3C7]">{formatCurrency(Number(item.subtotal))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RentalSaleCard({ rental }: { rental: Rental }) {
  const orders = rental.orders ?? []
  const ordersTotal = orders.reduce((acc, o) => acc + Number(o.totalAmount), 0)
  const grandTotal = Number(rental.totalAmount) + ordersTotal
  const spaceNames = rental.items.map(i => i.space.name).join(', ')

  return (
    <div className="bg-[#121927] border border-violet-500/20 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[14px] font-semibold text-[#F3F6FA] flex items-center gap-2">
            <CalendarClock size={14} className="text-violet-400" />
            {rental.customerName}
          </p>
          <p className="text-[12px] text-[#7E8CA6] mt-0.5">{formatDateTime(rental.paidAt ?? rental.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold text-emerald-400">{formatCurrency(grandTotal)}</p>
          {rental.paymentMethod && (
            <span className="text-[11px] bg-[#1A2333] border border-[#2A3650] rounded-lg px-2 py-0.5 text-[#A7B3C7]">
              {paymentMethodLabel(rental.paymentMethod)}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[13px]">
          <span className="text-[#7E8CA6]">Alquiler ({spaceNames})</span>
          <span className="text-[#A7B3C7]">{formatCurrency(Number(rental.totalAmount))}</span>
        </div>
        {orders.flatMap(o => o.items).map(item => (
          <div key={item.id} className="flex justify-between text-[13px]">
            <span className="text-[#7E8CA6]">
              {item.productVariant.product?.name} ({item.productVariant.name}) ×{item.quantity}
            </span>
            <span className="text-[#A7B3C7]">{formatCurrency(Number(item.subtotal))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
