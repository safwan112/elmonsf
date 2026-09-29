import type { ApiResource, Paginated } from '@/types/api'
import type { Cart, Enrollment, Invoice, Order, PurchasableKind } from '@/types/commerce'
import { api } from './client'

type WithMessage<T> = ApiResource<T> & { message?: string }

export const commerceApi = {
  cart: () => api.get<ApiResource<Cart>>('/cart').then((r) => r.data),
  addItem: (type: PurchasableKind, id: number) => api.post<WithMessage<Cart>>('/cart/items', { type, id }),
  removeItem: (itemId: number) => api.delete<WithMessage<Cart>>(`/cart/items/${itemId}`),
  applyCoupon: (code: string) => api.post<WithMessage<Cart>>('/cart/coupon', { code }),
  removeCoupon: () => api.delete<WithMessage<Cart>>('/cart/coupon'),

  checkout: (payload: { billing_name?: string; billing_phone?: string; accept_terms: boolean }) =>
    api.post<WithMessage<Order>>('/checkout', payload),

  createPayment: (orderNumber: string) =>
    api.post<{ data: { order_number: string; payment_url: string } }>('/payments/myfatoorah/create', { order_number: orderNumber }).then((r) => r.data),

  orders: (page = 1) => api.get<Paginated<Order>>('/orders', { params: { page } }),
  order: (number: string) => api.get<ApiResource<Order>>(`/orders/${encodeURIComponent(number)}`).then((r) => r.data),
  cancelOrder: (number: string) => api.post<WithMessage<Order>>(`/orders/${encodeURIComponent(number)}/cancel`),

  invoices: () => api.get<Paginated<Invoice>>('/invoices'),
  invoice: (number: string) => api.get<ApiResource<Invoice>>(`/invoices/${encodeURIComponent(number)}`).then((r) => r.data),

  enrollments: () => api.get<{ data: Enrollment[] }>('/enrollments').then((r) => r.data),
}
