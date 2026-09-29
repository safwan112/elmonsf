import type { CourseSummary, EnumValue, MoneyValue } from './catalog'
import type { CourseProgressSummary } from './learning'

export type PurchasableKind = 'course_plan' | 'product'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
export type PaymentStatus = OrderStatus

export interface CartItem {
  id: number
  type: PurchasableKind
  purchasable_id: number
  title: string
  slug: string | null
  plan_name: string | null
  duration_days: number | null
  url: string
  unit_price: MoneyValue
  discount: MoneyValue
  total: MoneyValue
}

export interface Cart {
  items: CartItem[]
  count: number
  subtotal: MoneyValue
  discount: MoneyValue
  tax: MoneyValue
  total: MoneyValue
  vat_rate: number
  coupon: { code: string; description: string | null } | null
  notices: { code: string; message: string }[]
}

export interface OrderItem {
  id: number
  type: PurchasableKind
  title: string
  plan_name: string | null
  duration_days: number | null
  course_slug: string | null
  product_slug: string | null
  unit_price: MoneyValue
  discount: MoneyValue
  total: MoneyValue
}

export interface OrderPayment {
  id: number
  provider: string
  status: EnumValue<PaymentStatus>
  amount: MoneyValue
  paid_at: string | null
  created_at: string | null
}

export interface Order {
  number: string
  status: EnumValue<OrderStatus>
  is_payable: boolean
  currency: string
  subtotal: MoneyValue
  discount: MoneyValue
  tax: MoneyValue
  total: MoneyValue
  coupon_code: string | null
  billing: { name: string; email: string; phone: string | null }
  items?: OrderItem[]
  items_count?: number
  payments?: OrderPayment[]
  has_pending_payment?: boolean
  invoice_number?: string | null
  failure_reason: string | null
  paid_at: string | null
  cancelled_at: string | null
  refunded_at: string | null
  created_at: string | null
}

export interface InvoiceLine {
  title: string
  plan_name: string | null
  unit_price: MoneyValue
  discount: MoneyValue
  total: MoneyValue
}

export interface Invoice {
  number: string
  order_number?: string
  issued_at: string
  currency: string
  vat_rate: number
  subtotal: MoneyValue
  discount: MoneyValue
  tax: MoneyValue
  total: MoneyValue
  seller: { name: string; vat_number: string | null; address: string | null; email: string | null }
  buyer: { name: string; email: string; phone: string | null }
  lines: InvoiceLine[]
}

export interface Enrollment {
  id: number
  status: EnumValue<'active' | 'expired' | 'revoked'>
  is_active: boolean
  source: string
  starts_at: string
  expires_at: string | null
  days_left: number | null
  course: CourseSummary
  progress?: CourseProgressSummary | null
}
