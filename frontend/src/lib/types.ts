export type Role = 'SUPERADMIN' | 'ADMIN' | 'CAJERO' | 'EMPLEADO'
export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'QR'
export type CashierStatus = 'ABIERTA' | 'CERRADA'
export type OrderStatus = 'PENDIENTE' | 'PAGADO' | 'CANCELADO'
export type PayrollPeriodType = 'QUINCENAL' | 'MENSUAL'
export type PayrollPeriodStatus = 'ABIERTO' | 'CERRADO'

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
  entryTime: string
  exitTime?: string
  notes?: string
}

export interface Product {
  id: string
  tenantId: string
  name: string
  description?: string
  price: number
  category: string
  imageUrl?: string
  isAvailable: boolean
  isActive: boolean
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
  product: Product
}

export interface Order {
  id: string
  tenantId: string
  customerName?: string
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
