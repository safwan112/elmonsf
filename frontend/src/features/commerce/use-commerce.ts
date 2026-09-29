import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commerceApi } from '@/api/commerce'
import { queryKeys } from '@/api/query-keys'
import { useCurrentUser } from '@/features/auth/use-auth'
import type { ApiResource } from '@/types/api'
import type { Cart, PurchasableKind } from '@/types/commerce'

/** The signed-in user's server-side cart (disabled for guests). */
export function useCart() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery({ queryKey: queryKeys.commerce.cart, queryFn: commerceApi.cart, enabled: isAuthenticated, staleTime: 30_000 })
}

function useSetCart() {
  const queryClient = useQueryClient()
  return (res: ApiResource<Cart>) => queryClient.setQueryData(queryKeys.commerce.cart, res.data)
}

export function useAddToCart() {
  const setCart = useSetCart()
  return useMutation({
    mutationFn: ({ type, id }: { type: PurchasableKind; id: number }) => commerceApi.addItem(type, id),
    meta: { silentError: true },
    onSuccess: setCart,
  })
}

export function useRemoveFromCart() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: (itemId: number) => commerceApi.removeItem(itemId), onSuccess: setCart })
}

export function useApplyCoupon() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: (code: string) => commerceApi.applyCoupon(code), meta: { silentError: true }, onSuccess: setCart })
}

export function useRemoveCoupon() {
  const setCart = useSetCart()
  return useMutation({ mutationFn: commerceApi.removeCoupon, onSuccess: setCart })
}

/**
 * Place the order, then start the MyFatoorah payment. Resolves with where
 * to send the browser: the hosted payment page, or the success page for
 * free orders.
 */
export function usePlaceOrderAndPay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { billing_name?: string; billing_phone?: string; accept_terms: boolean }) => {
      const order = (await commerceApi.checkout(payload)).data
      queryClient.invalidateQueries({ queryKey: queryKeys.commerce.cart })
      queryClient.invalidateQueries({ queryKey: ['commerce', 'orders'] })
      if (!order.is_payable) {
        return { order, redirect: `/payment/success?order=${encodeURIComponent(order.number)}`, external: false }
      }
      const payment = await commerceApi.createPayment(order.number)
      return { order, redirect: payment.payment_url, external: true }
    },
    meta: { silentError: true },
  })
}

/** Resume payment for an existing unpaid order. */
export function usePayOrder() {
  return useMutation({ mutationFn: (number: string) => commerceApi.createPayment(number) })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (number: string) => commerceApi.cancelOrder(number),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.commerce.order(res.data.number), res.data)
      queryClient.invalidateQueries({ queryKey: ['commerce', 'orders'] })
    },
  })
}

export const useOrders = (page: number) =>
  useQuery({ queryKey: queryKeys.commerce.orders(page), queryFn: () => commerceApi.orders(page) })

export const useOrder = (number: string, options: { poll?: boolean } = {}) =>
  useQuery({
    queryKey: queryKeys.commerce.order(number),
    queryFn: () => commerceApi.order(number),
    enabled: Boolean(number),
    // While a payment is being confirmed, poll until it settles.
    refetchInterval: (query) => (options.poll && query.state.data && !['paid', 'failed', 'cancelled', 'refunded'].includes(query.state.data.status.value) ? 3000 : false),
  })

export const useInvoices = () => useQuery({ queryKey: queryKeys.commerce.invoices, queryFn: commerceApi.invoices })

export const useInvoice = (number: string) =>
  useQuery({ queryKey: queryKeys.commerce.invoice(number), queryFn: () => commerceApi.invoice(number) })

export function useEnrollments() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery({ queryKey: queryKeys.commerce.enrollments, queryFn: commerceApi.enrollments, enabled: isAuthenticated })
}

/** Navigate the browser to the hosted payment page (full page load). */
export function redirectToPayment(url: string) {
  window.location.assign(url)
}
