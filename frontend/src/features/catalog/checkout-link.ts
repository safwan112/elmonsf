/**
 * Where "subscribe/buy" buttons lead. Checkout itself (cart, orders and
 * MyFatoorah payments) is implemented in the commerce module.
 */
export const checkoutPathForPlan = (planId: number) => `/checkout?plan=${planId}`
export const checkoutPathForProduct = (productId: number) => `/checkout?product=${productId}`
