'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getAxiosErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import {
  Package, Truck, ClipboardList, Plus, Pencil, PackagePlus,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductVariant, Supplier, PurchaseOrder } from '@/lib/types'

type Tab = 'productos' | 'proveedores' | 'compras'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'productos', label: 'Productos', icon: Package },
  { key: 'proveedores', label: 'Proveedores', icon: Truck },
  { key: 'compras', label: 'Órdenes de compra', icon: ClipboardList },
]

const inputCls = 'w-full bg-[#141B28] border border-[#1C2535] rounded-xl px-4 py-2.5 text-[14px] text-[#EDF2F7] placeholder:text-[#2A3A52] outline-none focus:border-emerald-500/50'
const labelCls = 'text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.15em] block mb-2'

export default function InventarioPage() {
  const [tab, setTab] = useState<Tab>('productos')

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-[24px] font-bold text-[#EDF2F7] flex items-center gap-3">
        <Package size={22} className="text-emerald-400" />
        Inventario
      </h1>

      <div className="flex gap-2 border-b border-[#1C2535] pb-px">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-[#4A5568] hover:text-[#8B96A8]',
            )}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'productos' && <ProductosPanel />}
      {tab === 'proveedores' && <ProveedoresPanel />}
      {tab === 'compras' && <ComprasPanel />}
    </div>
  )
}

// ── Productos ───────────────────────────────────────────────────────────────

const EMPTY_VARIANT = { name: '', purchaseUnit: 'Unidad', saleUnit: 'Unidad', unitsPerPurchase: '1', price: '', cost: '', stock: '0' }

function ProductosPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', brand: '', category: '', description: '' })
  const [variant, setVariant] = useState(EMPTY_VARIANT)

  const [addVariantFor, setAddVariantFor] = useState<string | null>(null)
  const [newVariant, setNewVariant] = useState(EMPTY_VARIANT)

  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [editForm, setEditForm] = useState({ price: '', cost: '', purchaseUnit: '', saleUnit: '', unitsPerPurchase: '', isAvailable: true })

  const [adjustingVariant, setAdjustingVariant] = useState<ProductVariant | null>(null)
  const [adjustForm, setAdjustForm] = useState({ quantity: '', reason: '' })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => api.get<Product[]>('/inventory/products'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory-products'] })

  const createProduct = useMutation({
    mutationFn: () => api.post('/inventory/products', {
      ...form,
      variants: [{
        ...variant,
        unitsPerPurchase: Number(variant.unitsPerPurchase),
        price: Number(variant.price),
        cost: Number(variant.cost || 0),
        stock: Number(variant.stock || 0),
      }],
    }),
    onSuccess: () => {
      toast.success('Producto creado')
      setShowForm(false)
      setForm({ name: '', brand: '', category: '', description: '' })
      setVariant(EMPTY_VARIANT)
      invalidate()
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const addVariant = useMutation({
    mutationFn: (productId: string) => api.post(`/inventory/products/${productId}/variants`, {
      ...newVariant,
      unitsPerPurchase: Number(newVariant.unitsPerPurchase),
      price: Number(newVariant.price),
      cost: Number(newVariant.cost || 0),
      stock: Number(newVariant.stock || 0),
    }),
    onSuccess: () => {
      toast.success('Presentación agregada')
      setAddVariantFor(null)
      setNewVariant(EMPTY_VARIANT)
      invalidate()
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const updateVariant = useMutation({
    mutationFn: () => api.patch(`/inventory/variants/${editingVariant!.id}`, {
      price: Number(editForm.price),
      cost: Number(editForm.cost),
      purchaseUnit: editForm.purchaseUnit,
      saleUnit: editForm.saleUnit,
      unitsPerPurchase: Number(editForm.unitsPerPurchase),
      isAvailable: editForm.isAvailable,
    }),
    onSuccess: () => {
      toast.success('Presentación actualizada')
      setEditingVariant(null)
      invalidate()
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const adjustStock = useMutation({
    mutationFn: () => api.post(`/inventory/variants/${adjustingVariant!.id}/adjust-stock`, {
      quantity: Number(adjustForm.quantity),
      reason: adjustForm.reason,
    }),
    onSuccess: () => {
      toast.success('Stock ajustado')
      setAdjustingVariant(null)
      setAdjustForm({ quantity: '', reason: '' })
      invalidate()
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const openEdit = (v: ProductVariant) => {
    setEditingVariant(v)
    setEditForm({
      price: String(v.price), cost: String(v.cost),
      purchaseUnit: v.purchaseUnit, saleUnit: v.saleUnit,
      unitsPerPurchase: String(v.unitsPerPurchase), isAvailable: v.isAvailable,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[14px] font-medium hover:bg-emerald-500/30 transition-colors">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {showForm && (
        <div className="bg-[#101520] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7]">Nuevo producto</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <input className={inputCls} placeholder="Coca-Cola" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Marca (opcional)</label>
              <input className={inputCls} placeholder="Coca-Cola Company" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Categoría</label>
              <input className={inputCls} placeholder="Bebidas / Papas fritas / Dulces" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Descripción (opcional)</label>
              <input className={inputCls} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="border-t border-[#1C2535] pt-4">
            <p className="text-[13px] font-semibold text-[#8B96A8] mb-3">Primera presentación</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Presentación</label>
                <input className={inputCls} placeholder="600ml / Bolsa 45g" value={variant.name}
                  onChange={e => setVariant(v => ({ ...v, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Precio de venta</label>
                <input type="number" className={inputCls} placeholder="2500" value={variant.price}
                  onChange={e => setVariant(v => ({ ...v, price: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Costo (opcional)</label>
                <input type="number" className={inputCls} placeholder="1200" value={variant.cost}
                  onChange={e => setVariant(v => ({ ...v, cost: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Unidad de compra</label>
                <input className={inputCls} placeholder="Caja" value={variant.purchaseUnit}
                  onChange={e => setVariant(v => ({ ...v, purchaseUnit: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Unidad de venta</label>
                <input className={inputCls} placeholder="Unidad / Lata / Bolsa" value={variant.saleUnit}
                  onChange={e => setVariant(v => ({ ...v, saleUnit: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Unidades de venta por unidad de compra</label>
                <input type="number" className={inputCls} placeholder="24" value={variant.unitsPerPurchase}
                  onChange={e => setVariant(v => ({ ...v, unitsPerPurchase: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Stock inicial</label>
                <input type="number" className={inputCls} placeholder="0" value={variant.stock}
                  onChange={e => setVariant(v => ({ ...v, stock: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]">Cancelar</button>
            <button
              onClick={() => createProduct.mutate()}
              disabled={!form.name || !form.category || !variant.name || !variant.price || createProduct.isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[#4A5568] text-center py-8">Cargando productos...</p>}
      {!isLoading && products.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay productos registrados</p>}

      <div className="space-y-4">
        {products.map(p => (
          <div key={p.id} className="bg-[#101520] border border-[#1C2535] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[15px] font-semibold text-[#EDF2F7]">{p.name}</p>
                <p className="text-[12px] text-[#4A5568]">{[p.brand, p.category].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => { setAddVariantFor(p.id); setNewVariant(EMPTY_VARIANT) }}
                className="flex items-center gap-1.5 text-[12px] text-emerald-400 hover:text-emerald-300">
                <PackagePlus size={14} /> Agregar presentación
              </button>
            </div>

            <div className="space-y-2">
              {p.variants.map(v => (
                <div key={v.id}>
                  {editingVariant?.id === v.id ? (
                    <div className="bg-[#141B28] border border-emerald-500/20 rounded-xl p-3 grid grid-cols-3 gap-3">
                      <div><label className={labelCls}>Precio</label>
                        <input type="number" className={inputCls} value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} /></div>
                      <div><label className={labelCls}>Costo</label>
                        <input type="number" className={inputCls} value={editForm.cost} onChange={e => setEditForm(f => ({ ...f, cost: e.target.value }))} /></div>
                      <div><label className={labelCls}>Uds. venta / compra</label>
                        <input type="number" className={inputCls} value={editForm.unitsPerPurchase} onChange={e => setEditForm(f => ({ ...f, unitsPerPurchase: e.target.value }))} /></div>
                      <div><label className={labelCls}>Unidad de compra</label>
                        <input className={inputCls} value={editForm.purchaseUnit} onChange={e => setEditForm(f => ({ ...f, purchaseUnit: e.target.value }))} /></div>
                      <div><label className={labelCls}>Unidad de venta</label>
                        <input className={inputCls} value={editForm.saleUnit} onChange={e => setEditForm(f => ({ ...f, saleUnit: e.target.value }))} /></div>
                      <label className="flex items-center gap-2 text-[13px] text-[#8B96A8] mt-6">
                        <input type="checkbox" checked={editForm.isAvailable} onChange={e => setEditForm(f => ({ ...f, isAvailable: e.target.checked }))} />
                        Disponible para venta
                      </label>
                      <div className="col-span-3 flex gap-2 mt-1">
                        <button onClick={() => setEditingVariant(null)} className="flex-1 py-2 rounded-lg border border-[#1C2535] text-[#4A5568] text-[13px]">Cancelar</button>
                        <button onClick={() => updateVariant.mutate()} disabled={updateVariant.isPending}
                          className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[13px] disabled:opacity-40">Guardar</button>
                      </div>
                    </div>
                  ) : adjustingVariant?.id === v.id ? (
                    <div className="bg-[#141B28] border border-sky-500/20 rounded-xl p-3 flex items-end gap-3">
                      <div className="flex-1">
                        <label className={labelCls}>Cantidad (+ entra / − sale)</label>
                        <input type="number" className={inputCls} placeholder="ej. 24 o -3" value={adjustForm.quantity}
                          onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} />
                      </div>
                      <div className="flex-1">
                        <label className={labelCls}>Motivo</label>
                        <input className={inputCls} placeholder="Conteo físico / merma" value={adjustForm.reason}
                          onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} />
                      </div>
                      <button onClick={() => setAdjustingVariant(null)} className="py-2.5 px-3 rounded-lg border border-[#1C2535] text-[#4A5568] text-[13px]">Cancelar</button>
                      <button onClick={() => adjustStock.mutate()} disabled={!adjustForm.quantity || !adjustForm.reason || adjustStock.isPending}
                        className="py-2.5 px-3 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[13px] disabled:opacity-40">Aplicar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-[#141B28] border border-[#1C2535]">
                      <div className="min-w-0">
                        <p className="text-[13px] text-[#EDF2F7] truncate">{v.name}</p>
                        <p className="text-[11px] text-[#4A5568]">
                          {v.purchaseUnit} → {v.unitsPerPurchase} × {v.saleUnit} · costo {formatCurrency(Number(v.cost))}
                          {!v.isAvailable && <span className="text-amber-400"> · oculto en tienda</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn('text-[12px] font-medium', v.stock <= 0 ? 'text-rose-400' : 'text-[#8B96A8]')}>{v.stock} {v.saleUnit}</span>
                        <span className="text-[13px] font-bold text-emerald-400 w-20 text-right">{formatCurrency(Number(v.price))}</span>
                        <button onClick={() => { setAdjustingVariant(v); setAdjustForm({ quantity: '', reason: '' }) }}
                          className="w-7 h-7 rounded-lg bg-[#1C2535] text-[#8B96A8] hover:text-sky-400 flex items-center justify-center" title="Ajustar stock">
                          <PackagePlus size={13} />
                        </button>
                        <button onClick={() => openEdit(v)}
                          className="w-7 h-7 rounded-lg bg-[#1C2535] text-[#8B96A8] hover:text-emerald-400 flex items-center justify-center" title="Editar">
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {addVariantFor === p.id && (
                <div className="bg-[#141B28] border border-emerald-500/20 rounded-xl p-3 grid grid-cols-3 gap-3">
                  <div><label className={labelCls}>Presentación</label>
                    <input className={inputCls} placeholder="1.5L" value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))} /></div>
                  <div><label className={labelCls}>Precio</label>
                    <input type="number" className={inputCls} value={newVariant.price} onChange={e => setNewVariant(v => ({ ...v, price: e.target.value }))} /></div>
                  <div><label className={labelCls}>Costo</label>
                    <input type="number" className={inputCls} value={newVariant.cost} onChange={e => setNewVariant(v => ({ ...v, cost: e.target.value }))} /></div>
                  <div><label className={labelCls}>Unidad de compra</label>
                    <input className={inputCls} value={newVariant.purchaseUnit} onChange={e => setNewVariant(v => ({ ...v, purchaseUnit: e.target.value }))} /></div>
                  <div><label className={labelCls}>Unidad de venta</label>
                    <input className={inputCls} value={newVariant.saleUnit} onChange={e => setNewVariant(v => ({ ...v, saleUnit: e.target.value }))} /></div>
                  <div><label className={labelCls}>Uds. venta / compra</label>
                    <input type="number" className={inputCls} value={newVariant.unitsPerPurchase} onChange={e => setNewVariant(v => ({ ...v, unitsPerPurchase: e.target.value }))} /></div>
                  <div><label className={labelCls}>Stock inicial</label>
                    <input type="number" className={inputCls} value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock: e.target.value }))} /></div>
                  <div className="col-span-3 flex gap-2">
                    <button onClick={() => setAddVariantFor(null)} className="flex-1 py-2 rounded-lg border border-[#1C2535] text-[#4A5568] text-[13px]">Cancelar</button>
                    <button onClick={() => addVariant.mutate(p.id)} disabled={!newVariant.name || !newVariant.price || addVariant.isPending}
                      className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[13px] disabled:opacity-40">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Proveedores ─────────────────────────────────────────────────────────────

function ProveedoresPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' })

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<Supplier[]>('/inventory/suppliers'),
  })

  const create = useMutation({
    mutationFn: () => api.post('/inventory/suppliers', form),
    onSuccess: () => {
      toast.success('Proveedor registrado')
      setShowForm(false)
      setForm({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/inventory/suppliers/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[14px] font-medium hover:bg-emerald-500/30 transition-colors">
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      {showForm && (
        <div className="bg-[#101520] border border-emerald-500/20 rounded-2xl p-5">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7] mb-4">Nuevo proveedor</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Nombre / Razón social', placeholder: 'Distribuidora XYZ' },
              { key: 'contactName', label: 'Persona de contacto', placeholder: 'Jorge Peña' },
              { key: 'phone', label: 'Teléfono', placeholder: '3001234567' },
              { key: 'email', label: 'Email', placeholder: 'ventas@...' },
              { key: 'address', label: 'Dirección', placeholder: '' },
              { key: 'notes', label: 'Notas', placeholder: '' },
            ].map(f => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <input className={inputCls} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]">Cancelar</button>
            <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[#4A5568] text-center py-8">Cargando proveedores...</p>}
      {!isLoading && suppliers.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay proveedores registrados</p>}

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className={cn('bg-[#101520] border rounded-2xl p-5', s.isActive ? 'border-[#1C2535]' : 'border-[#1C2535] opacity-50')}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[15px] font-semibold text-[#EDF2F7]">{s.name}</p>
              <button onClick={() => toggleActive.mutate({ id: s.id, isActive: !s.isActive })}
                title={s.isActive ? 'Desactivar' : 'Reactivar'}
                className={s.isActive ? 'text-emerald-400' : 'text-[#4A5568]'}>
                {s.isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </button>
            </div>
            {s.contactName && <p className="text-[12px] text-[#8B96A8]">{s.contactName}</p>}
            {s.phone && <p className="text-[12px] text-[#4A5568]">{s.phone}</p>}
            {s.email && <p className="text-[12px] text-[#4A5568]">{s.email}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Órdenes de compra ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = { PENDIENTE: 'Pendiente', RECIBIDA: 'Recibida', CANCELADA: 'Cancelada' }
const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  RECIBIDA: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  CANCELADA: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
}

function ComprasPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ productVariantId: string; quantity: string; unitCost: string }[]>([
    { productVariantId: '', quantity: '', unitCost: '' },
  ])
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get<PurchaseOrder[]>('/inventory/purchase-orders'),
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<Supplier[]>('/inventory/suppliers'),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => api.get<Product[]>('/inventory/products'),
  })

  const variantOptions = products.flatMap(p => p.variants.map(v => ({ id: v.id, label: `${p.name} — ${v.name}` })))

  const resetForm = () => {
    setSupplierId(''); setNotes(''); setItems([{ productVariantId: '', quantity: '', unitCost: '' }])
  }

  const create = useMutation({
    mutationFn: () => api.post('/inventory/purchase-orders', {
      supplierId,
      notes: notes || undefined,
      items: items.map(i => ({ productVariantId: i.productVariantId, quantity: Number(i.quantity), unitCost: Number(i.unitCost) })),
    }),
    onSuccess: () => {
      toast.success('Orden de compra creada')
      setShowForm(false)
      resetForm()
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const receive = useMutation({
    mutationFn: (id: string) => api.post(`/inventory/purchase-orders/${id}/receive`),
    onSuccess: () => {
      toast.success('Orden recibida, stock actualizado')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['inventory-products'] })
      qc.invalidateQueries({ queryKey: ['store-products'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/inventory/purchase-orders/${id}/cancel`),
    onSuccess: () => {
      toast.success('Orden cancelada')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (e) => toast.error(getAxiosErrorMessage(e)),
  })

  const updateItem = (idx: number, patch: Partial<{ productVariantId: string; quantity: string; unitCost: string }>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  const canSubmit = !!supplierId && items.length > 0 && items.every(i => i.productVariantId && i.quantity && i.unitCost)
  const formTotal = items.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[14px] font-medium hover:bg-emerald-500/30 transition-colors">
          <Plus size={16} /> Nueva orden de compra
        </button>
      </div>

      {showForm && (
        <div className="bg-[#101520] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
          <h2 className="text-[16px] font-semibold text-[#EDF2F7]">Nueva orden de compra</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Proveedor</label>
              <select className={inputCls} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Selecciona un proveedor...</option>
                {suppliers.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-[#8B96A8]">Ítems</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-[2]">
                  <label className={labelCls}>Presentación</label>
                  <select className={inputCls} value={item.productVariantId} onChange={e => updateItem(idx, { productVariantId: e.target.value })}>
                    <option value="">Selecciona...</option>
                    {variantOptions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Cant. (u. compra)</label>
                  <input type="number" className={inputCls} value={item.quantity} onChange={e => updateItem(idx, { quantity: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Costo unitario</label>
                  <input type="number" className={inputCls} value={item.unitCost} onChange={e => updateItem(idx, { unitCost: e.target.value })} />
                </div>
                <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}
                  className="w-9 h-9 rounded-lg bg-[#1C2535] text-[#8B96A8] hover:text-rose-400 flex items-center justify-center disabled:opacity-30 mb-0.5">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => setItems(prev => [...prev, { productVariantId: '', quantity: '', unitCost: '' }])}
              className="text-[12px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5">
              <Plus size={13} /> Agregar ítem
            </button>
          </div>

          <div className="flex justify-between items-center border-t border-[#1C2535] pt-3">
            <span className="text-[13px] text-[#4A5568]">Total</span>
            <span className="text-[16px] font-bold text-emerald-400">{formatCurrency(formTotal)}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setShowForm(false); resetForm() }} className="flex-1 py-2.5 rounded-xl border border-[#1C2535] text-[#4A5568] hover:text-[#8B96A8]">Cancelar</button>
            <button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
              Crear orden
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[#4A5568] text-center py-8">Cargando órdenes...</p>}
      {!isLoading && orders.length === 0 && <p className="text-[#4A5568] text-center py-8">No hay órdenes de compra registradas</p>}

      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="bg-[#101520] border border-[#1C2535] rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="w-full flex items-center justify-between p-5 text-left">
              <div className="flex items-center gap-3">
                {expanded === o.id ? <ChevronDown size={16} className="text-[#4A5568]" /> : <ChevronRight size={16} className="text-[#4A5568]" />}
                <div>
                  <p className="text-[14px] font-semibold text-[#EDF2F7]">{o.supplier.name}</p>
                  <p className="text-[12px] text-[#4A5568]">{formatDateTime(o.orderDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-bold text-emerald-400">{formatCurrency(Number(o.totalAmount))}</span>
                <span className={cn('text-[11px] rounded-lg px-2.5 py-1 border font-medium', STATUS_COLOR[o.status])}>{STATUS_LABEL[o.status]}</span>
              </div>
            </button>

            {expanded === o.id && (
              <div className="px-5 pb-5 space-y-3">
                <div className="space-y-1.5">
                  {o.items.map(item => (
                    <div key={item.id} className="flex justify-between text-[13px]">
                      <span className="text-[#4A5568]">
                        {item.productVariant.product?.name} ({item.productVariant.name}) × {item.quantity} {item.productVariant.purchaseUnit}
                      </span>
                      <span className="text-[#8B96A8]">{formatCurrency(Number(item.subtotal))}</span>
                    </div>
                  ))}
                </div>
                {o.status === 'PENDIENTE' && (
                  <div className="flex gap-3 pt-2 border-t border-[#1C2535]">
                    <button onClick={() => cancel.mutate(o.id)} disabled={cancel.isPending}
                      className="flex-1 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[13px] font-medium disabled:opacity-40">
                      Cancelar orden
                    </button>
                    <button onClick={() => receive.mutate(o.id)} disabled={receive.isPending}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[13px] font-medium disabled:opacity-40">
                      Marcar como recibida
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
