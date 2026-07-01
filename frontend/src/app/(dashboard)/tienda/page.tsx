'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductVariant, CashierSession } from '@/lib/types'

interface CartItem { variant: ProductVariant; productName: string; quantity: number }

export default function TiendaPage() {
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [payModal, setPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState<string>('EFECTIVO')
  const [amountPaid, setAmountPaid] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  const { data: products = [] } = useQuery({
    queryKey: ['store-products'],
    queryFn: () => api.get<Product[]>('/store/products'),
  })

  const { data: session } = useQuery({
    queryKey: ['cashier-active'],
    queryFn: () => api.get<CashierSession | null>('/cashier/active'),
  })

  const total = cart.reduce((acc, i) => acc + Number(i.variant.price) * i.quantity, 0)

  const cartQuantity = (variantId: string) => cart.find(i => i.variant.id === variantId)?.quantity ?? 0

  const addToCart = (product: Product, variant: ProductVariant) => {
    if (cartQuantity(variant.id) >= variant.stock) {
      toast.error(`Sin stock disponible de ${product.name} (${variant.name})`)
      return
    }
    setCart(prev => {
      const found = prev.find(i => i.variant.id === variant.id)
      if (found) return prev.map(i => i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { variant, productName: product.name, quantity: 1 }]
    })
  }

  const removeFromCart = (variantId: string) => {
    setCart(prev => {
      const found = prev.find(i => i.variant.id === variantId)
      if (!found) return prev
      if (found.quantity === 1) return prev.filter(i => i.variant.id !== variantId)
      return prev.map(i => i.variant.id === variantId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const createOrder = useMutation({
    mutationFn: () => api.post<{ id: string }>('/store/orders', {
      items: cart.map(i => ({ productVariantId: i.variant.id, quantity: i.quantity })),
    }),
    onSuccess: (order) => {
      setOrderId(order.id)
      setPayModal(true)
      qc.invalidateQueries({ queryKey: ['store-products'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const cancelOrder = useMutation({
    mutationFn: () => api.post(`/store/orders/${orderId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-products'] }),
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const payOrder = useMutation({
    mutationFn: () => api.post(`/store/orders/${orderId}/pay`, {
      paymentMethod: payMethod,
      amountPaid: Number(amountPaid),
      cashierSessionId: session!.id,
    }),
    onSuccess: () => {
      toast.success('Venta registrada')
      setCart([]); setPayModal(false); setOrderId(null); setAmountPaid('')
      qc.invalidateQueries({ queryKey: ['cashier-active'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const handleCancelPay = () => {
    if (orderId) cancelOrder.mutate()
    setPayModal(false); setOrderId(null); setAmountPaid('')
  }

  const categories = [...new Set(products.map(p => p.category))]

  return (
    <div className="flex h-full">
      {/* Products */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h1 className="text-[24px] font-bold text-[#EDF2F7]">Tienda</h1>
        {categories.map(cat => (
          <div key={cat}>
            <h2 className="text-[13px] font-semibold text-[#4A5568] uppercase tracking-[0.15em] mb-3">{cat}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {products.filter(p => p.category === cat).map(p => (
                <div key={p.id} className="bg-[#101520] border border-[#1C2535] rounded-2xl p-4">
                  <p className="text-[14px] font-medium text-[#EDF2F7]">{p.name}</p>
                  {p.brand && <p className="text-[11px] text-[#4A5568] mt-0.5">{p.brand}</p>}
                  <div className="mt-3 space-y-1.5">
                    {p.variants.map(v => {
                      const inCartQty = cartQuantity(v.id)
                      const outOfStock = v.stock - inCartQty <= 0
                      return (
                        <button
                          key={v.id}
                          onClick={() => addToCart(p, v)}
                          disabled={outOfStock}
                          className="w-full flex items-center justify-between rounded-xl px-3 py-2 bg-[#141B28] border border-[#1C2535] hover:border-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors group"
                        >
                          <span className="text-[12px] text-[#8B96A8] group-hover:text-sky-400 transition-colors truncate">{v.name}</span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] ${outOfStock ? 'text-rose-400' : 'text-[#4A5568]'}`}>
                              {outOfStock ? 'Sin stock' : `${v.stock - inCartQty} disp.`}
                            </span>
                            <span className="text-[13px] font-bold text-sky-400">{formatCurrency(Number(v.price))}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-[#4A5568] text-center py-8">No hay productos disponibles para la venta</p>
        )}
      </div>

      {/* Cart */}
      <div className="w-72 border-l border-[#1C2535] bg-[#0C1018] flex flex-col">
        <div className="p-5 border-b border-[#1C2535]">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] flex items-center gap-2">
            <ShoppingCart size={16} className="text-sky-400" />
            Carrito ({cart.reduce((a, i) => a + i.quantity, 0)})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0
            ? <p className="text-[#4A5568] text-sm text-center py-8">Sin productos</p>
            : cart.map(item => (
              <div key={item.variant.id} className="flex items-center gap-3 p-3 bg-[#141B28] rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#EDF2F7] truncate">{item.productName}</p>
                  <p className="text-[11px] text-[#4A5568] truncate">{item.variant.name}</p>
                  <p className="text-[12px] text-sky-400">{formatCurrency(Number(item.variant.price))}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => removeFromCart(item.variant.id)} className="w-6 h-6 rounded-lg bg-[#1C2535] text-[#8B96A8] hover:text-rose-400 flex items-center justify-center">
                    {item.quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                  </button>
                  <span className="text-[13px] font-medium text-[#EDF2F7] w-5 text-center">{item.quantity}</span>
                  <button onClick={() => {
                    const product = products.find(p => p.id === item.variant.productId)
                    if (product) addToCart(product, item.variant)
                  }} className="w-6 h-6 rounded-lg bg-[#1C2535] text-[#8B96A8] hover:text-sky-400 flex items-center justify-center">
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            ))
          }
        </div>

        <div className="p-5 border-t border-[#1C2535] space-y-4">
          <div className="flex justify-between">
            <span className="text-[14px] text-[#4A5568]">Total</span>
            <span className="text-[18px] font-bold text-sky-400">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={() => createOrder.mutate()}
            disabled={cart.length === 0 || !session || createOrder.isPending}
            className="w-full py-3.5 rounded-xl font-semibold text-[14px] bg-gradient-to-r from-sky-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-sky-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={15} />
            Cobrar
          </button>
          {!session && <p className="text-[11px] text-amber-400 text-center">Abre una caja primero</p>}
        </div>
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E1521] border border-[#1C2535] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[18px] font-bold text-[#EDF2F7]">Pago — {formatCurrency(total)}</h3>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO','TARJETA','TRANSFERENCIA','QR'].map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`py-2.5 rounded-xl text-[13px] font-medium border transition-colors ${payMethod === m ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-[#141B28] border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2">Monto recibido</label>
              <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                placeholder={String(total)}
                className="w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-3 text-[14px] text-[#EDF2F7] outline-none focus:border-sky-500/50" />
              {Number(amountPaid) >= total && (
                <p className="text-emerald-400 text-[13px] mt-1">Cambio: {formatCurrency(Number(amountPaid) - total)}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancelPay}
                className="flex-1 py-3 rounded-xl border border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8] text-[14px]">
                Cancelar
              </button>
              <button onClick={() => payOrder.mutate()}
                disabled={!amountPaid || Number(amountPaid) < total || payOrder.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
