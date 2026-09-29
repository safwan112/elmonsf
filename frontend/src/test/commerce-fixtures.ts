import type { Cart, Enrollment, Invoice, Order } from '@/types/commerce'
import { courseSummary } from './catalog-fixtures'

export const money = (amount: number) => ({ amount, amount_minor: Math.round(amount * 100), currency: 'SAR' })

export function cartWith(overrides: Partial<Cart> = {}): Cart {
  return {
    items: [
      {
        id: 7,
        type: 'course_plan',
        purchasable_id: 11,
        title: 'تأسيس القسم الكمي',
        slug: 'تأسيس-الكمي',
        plan_name: '3 أشهر',
        duration_days: 90,
        url: '/courses/تأسيس-الكمي',
        unit_price: money(199),
        discount: money(0),
        total: money(199),
      },
    ],
    count: 1,
    subtotal: money(199),
    discount: money(0),
    tax: money(25.96),
    total: money(199),
    vat_rate: 15,
    coupon: null,
    notices: [],
    ...overrides,
  }
}

const statusLabels = { pending: 'بانتظار الدفع', paid: 'مدفوع', failed: 'فشل الدفع', cancelled: 'ملغي', refunded: 'مسترد' } as const

export function makeOrder(status: Order['status']['value'] = 'pending', overrides: Partial<Order> = {}): Order {
  return {
    number: 'ORD-2026-000001',
    status: { value: status, label: statusLabels[status] },
    is_payable: status === 'pending' || status === 'failed',
    currency: 'SAR',
    subtotal: money(199),
    discount: money(0),
    tax: money(25.96),
    total: money(199),
    coupon_code: null,
    billing: { name: 'ريم الشهري', email: 'reem@example.com', phone: null },
    items: [
      {
        id: 1,
        type: 'course_plan',
        title: 'تأسيس القسم الكمي',
        plan_name: '3 أشهر',
        duration_days: 90,
        course_slug: 'تأسيس-الكمي',
        product_slug: null,
        unit_price: money(199),
        discount: money(0),
        total: money(199),
      },
    ],
    payments: [],
    has_pending_payment: false,
    invoice_number: status === 'paid' ? 'INV-2026-000001' : null,
    failure_reason: null,
    paid_at: status === 'paid' ? '2026-09-20T10:00:00+00:00' : null,
    cancelled_at: null,
    refunded_at: null,
    created_at: '2026-09-20T09:58:00+00:00',
    ...overrides,
  }
}

export const invoice: Invoice = {
  number: 'INV-2026-000001',
  order_number: 'ORD-2026-000001',
  issued_at: '2026-09-20T10:00:00+00:00',
  currency: 'SAR',
  vat_rate: 15,
  subtotal: money(199),
  discount: money(0),
  tax: money(25.96),
  total: money(199),
  seller: { name: 'منصة ذروة التعليمية', vat_number: '300000000000003', address: 'الرياض', email: 'billing@example.com' },
  buyer: { name: 'ريم الشهري', email: 'reem@example.com', phone: null },
  lines: [{ title: 'تأسيس القسم الكمي', plan_name: '3 أشهر', unit_price: money(199), discount: money(0), total: money(199) }],
}

export function makeEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 1,
    status: { value: 'active', label: 'نشط' },
    is_active: true,
    source: 'purchase',
    starts_at: '2026-09-20T10:00:00+00:00',
    expires_at: '2026-12-19T10:00:00+00:00',
    days_left: 81,
    course: courseSummary(),
    ...overrides,
  }
}
