export type Role = 'SUPERADMIN' | 'ADMIN' | 'CAJERO' | 'EMPLEADO'
export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'QR'
export type CashierStatus = 'ABIERTA' | 'CERRADA'
export type OrderStatus = 'PENDIENTE' | 'PAGADO' | 'CANCELADO'
export type PayrollPeriodType = 'QUINCENAL' | 'MENSUAL'
export type PayrollPeriodStatus = 'ABIERTO' | 'CERRADO'
export type PurchaseOrderStatus = 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA'

export interface Tenant {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logoUrl?: string
  isActive: boolean
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  tenantId: string | null
  tenant?: Pick<Tenant, 'id' | 'name' | 'logoUrl'> | null
  isActive: boolean
}

export interface AccessEntry {
  id: string
  tenantId: string
  visitorName?: string
  pax: number
  adults: number
  children: number
  freeMinors: number
  totalAmount: number
  paymentMethod?: PaymentMethod
  amountPaid?: number
  change: number
  cashierSessionId?: string
  entryTime: string
  exitTime?: string
  notes?: string
  /** Solo presente en /access/open-tabs: pedidos de tienda PENDIENTE cargados a esta cuenta */
  orders?: Order[]
}

export interface AccessPricing {
  entryAdultPrice: number
  entryChildPrice: number
  entryFreeUnderAge: number
}

export interface ProductVariant {
  id: string
  tenantId: string
  productId: string
  name: string
  sku?: string
  barcode?: string
  purchaseUnit: string
  saleUnit: string
  unitsPerPurchase: number
  price: number
  cost: number
  stock: number
  isAvailable: boolean
  isActive: boolean
  product?: Product
}

export interface Product {
  id: string
  tenantId: string
  name: string
  brand?: string
  description?: string
  category: string
  imageUrl?: string
  isActive: boolean
  variants: ProductVariant[]
}

export interface Supplier {
  id: string
  tenantId: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive: boolean
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productVariantId: string
  quantity: number
  unitCost: number
  subtotal: number
  notes?: string
  productVariant: ProductVariant
}

export interface PurchaseOrder {
  id: string
  tenantId: string
  supplierId: string
  status: PurchaseOrderStatus
  orderDate: string
  receivedAt?: string
  totalAmount: number
  notes?: string
  createdBy: string
  supplier: Supplier
  items: PurchaseOrderItem[]
}

export interface OrderItem {
  id: string
  productVariantId: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
  productVariant: ProductVariant
}

export interface Order {
  id: string
  tenantId: string
  customerName?: string
  accessEntryId?: string
  status: OrderStatus
  totalAmount: number
  notes?: string
  createdAt: string
  items: OrderItem[]
}

export interface Sale {
  id: string
  tenantId: string
  orderId: string
  cashierSessionId: string
  totalAmount: number
  paymentMethod: PaymentMethod
  amountPaid: number
  change: number
  createdAt: string
  order: Order
}

export interface CashExpense {
  id: string
  description: string
  type: string
  totalAmount: number
  notes?: string
  createdAt: string
}

export interface CashierSession {
  id: string
  tenantId: string
  userId: string
  status: CashierStatus
  openingAmount: number
  closingAmount?: number
  totalSales: number
  totalExpenses: number
  totalIngresos: number
  difference?: number
  openedAt: string
  closedAt?: string
  notes?: string
  user?: { name: string }
  sales?: Sale[]
  cashExpenses?: CashExpense[]
}

export interface Employee {
  id: string
  tenantId: string
  name: string
  role: string
  baseSalary: number
  phone?: string
  email?: string
  notes?: string
  isActive: boolean
  hiredAt: string
}

export interface PayrollEntry {
  id: string
  payrollPeriodId: string
  employeeId: string
  baseSalary: number
  extras: number
  deductions: number
  total: number
  isPaid: boolean
  paidAt?: string
  notes?: string
  employee: Employee
}

export interface PayrollPeriod {
  id: string
  tenantId: string
  periodType: PayrollPeriodType
  startDate: string
  endDate: string
  status: PayrollPeriodStatus
  notes?: string
  createdAt: string
  closedAt?: string
  entries: PayrollEntry[]
}
