import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cartWith, invoice, makeEnrollment, makeOrder, money } from '@/test/commerce-fixtures'
import { makeUser, student } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, emptyPage, http, HttpResponse, server, signInAs } from '@/test/server'

// Full-page navigation to the hosted payment page cannot happen in jsdom.
const redirectToPayment = vi.hoisted(() => vi.fn())
vi.mock('@/features/commerce/use-commerce', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/commerce/use-commerce')>()),
  redirectToPayment,
}))

beforeEach(() => {
  redirectToPayment.mockReset()
})

describe('cart', () => {
  it('sends guests to login first', async () => {
    const { router } = renderApp('/cart')
    await screen.findByRole('heading', { name: 'مرحباً بعودتك' })
    expect(router.state.location.search).toBe('?redirect=%2Fcart')
  })

  it('shows items and totals, and the item count in the header', async () => {
    signInAs(student)
    server.use(http.get(`${API}/cart`, () => HttpResponse.json({ data: cartWith() })))
    renderApp('/cart')

    expect(await screen.findByRole('link', { name: 'تأسيس القسم الكمي' })).toBeInTheDocument()
    expect(screen.getByText(/3 أشهر/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'السلة (1)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إتمام الشراء' })).toHaveAttribute('href', '/checkout')
  })

  it('applies a coupon and shows server validation errors', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: cartWith() })),
      http.post(`${API}/cart/coupon`, async ({ request }) => {
        const { code } = (await request.json()) as { code: string }
        if (code !== 'SAVE20') {
          return HttpResponse.json(
            { message: 'رمز الخصم غير صالح.', code: 'validation_failed', errors: { code: ['رمز الخصم غير صالح.'] } },
            { status: 422 },
          )
        }
        return HttpResponse.json({
          message: 'تم تطبيق رمز الخصم.',
          data: cartWith({ coupon: { code: 'SAVE20', description: null }, discount: money(39.8), total: money(159.2) }),
        })
      }),
    )
    const { user } = renderApp('/cart')
    const input = await screen.findByLabelText('رمز الخصم')

    await user.type(input, 'nope')
    await user.click(screen.getByRole('button', { name: 'تطبيق' }))
    expect(await screen.findByText('رمز الخصم غير صالح.')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'save20')
    await user.click(screen.getByRole('button', { name: 'تطبيق' }))
    expect(await screen.findByRole('button', { name: 'إزالة رمز الخصم' })).toBeInTheDocument()
    expect(screen.getAllByText('SAVE20').length).toBeGreaterThan(0)
  })

  it('removes an item', async () => {
    signInAs(student)
    let removed = false
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: cartWith() })),
      http.delete(`${API}/cart/items/7`, () => {
        removed = true
        return HttpResponse.json({ data: cartWith({ items: [], count: 0, total: money(0) }) })
      }),
    )
    const { user } = renderApp('/cart')
    await user.click(await screen.findByRole('button', { name: 'إزالة تأسيس القسم الكمي' }))
    expect(await screen.findByText('سلتك فارغة')).toBeInTheDocument()
    expect(removed).toBe(true)
  })
})

describe('checkout', () => {
  it('adds the chosen plan, requires the terms, places the order and redirects to MyFatoorah', async () => {
    signInAs(student)
    let cart = cartWith({ items: [], count: 0 })
    const calls: string[] = []
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: cart })),
      http.post(`${API}/cart/items`, async ({ request }) => {
        calls.push(`add:${JSON.stringify(await request.json())}`)
        cart = cartWith()
        return HttpResponse.json({ data: cart }, { status: 201 })
      }),
      http.post(`${API}/checkout`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        calls.push(`checkout:${body.accept_terms}:${body.billing_name}`)
        return HttpResponse.json({ data: makeOrder('pending') }, { status: 201 })
      }),
      http.post(`${API}/payments/myfatoorah/create`, async ({ request }) => {
        calls.push(`pay:${((await request.json()) as { order_number: string }).order_number}`)
        return HttpResponse.json({ data: { order_number: 'ORD-2026-000001', payment_url: 'https://pay.example/invoice/1' } })
      }),
    )
    const { user, router } = renderApp('/checkout?plan=11')

    const payButton = await screen.findByRole('button', { name: /ادفع/ })
    expect(calls[0]).toBe('add:{"type":"course_plan","id":11}')
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(screen.getByLabelText('الاسم في الفاتورة')).toHaveValue('ريم الشهري')

    await user.click(payButton)
    expect(await screen.findByText('يجب الموافقة على الشروط وسياسة الاسترجاع للمتابعة')).toBeInTheDocument()
    expect(calls).toHaveLength(1)

    await user.click(screen.getByRole('checkbox'))
    await user.click(payButton)
    await waitFor(() => expect(redirectToPayment).toHaveBeenCalledWith('https://pay.example/invoice/1'))
    expect(calls).toEqual(['add:{"type":"course_plan","id":11}', 'checkout:true:ريم الشهري', 'pay:ORD-2026-000001'])
  })

  it('blocks payment until the email address is verified', async () => {
    signInAs(makeUser({ email_verified: false, email_verified_at: null }))
    server.use(http.get(`${API}/cart`, () => HttpResponse.json({ data: cartWith() })))
    renderApp('/checkout')

    expect(await screen.findByText('أكّد بريدك الإلكتروني لإتمام الدفع')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ادفع/ })).toBeDisabled()
  })

  it('shows gateway errors without leaving the page', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: cartWith() })),
      http.post(`${API}/checkout`, () => HttpResponse.json({ data: makeOrder('pending') }, { status: 201 })),
      http.post(`${API}/payments/myfatoorah/create`, () =>
        HttpResponse.json({ message: 'بوابة الدفع غير متاحة حالياً.', code: 'payment_gateway_unavailable' }, { status: 502 }),
      ),
    )
    const { user } = renderApp('/checkout')
    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /ادفع/ }))
    expect(await screen.findByText('بوابة الدفع غير متاحة حالياً.')).toBeInTheDocument()
    expect(redirectToPayment).not.toHaveBeenCalled()
  })

  it('completes free orders without the payment gateway', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: cartWith({ total: money(0), discount: money(199) }) })),
      http.post(`${API}/checkout`, () =>
        HttpResponse.json({ data: makeOrder('paid', { total: money(0), is_payable: false }) }, { status: 201 }),
      ),
      http.get(`${API}/orders/:number`, () => HttpResponse.json({ data: makeOrder('paid', { total: money(0) }) })),
    )
    const { user, router } = renderApp('/checkout')
    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'تأكيد الطلب' }))

    expect(await screen.findByRole('heading', { name: /تم الدفع بنجاح/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/payment/success')
    expect(redirectToPayment).not.toHaveBeenCalled()
  })
})

describe('payment result pages', () => {
  it('waits for confirmation, then links to the course and invoice', async () => {
    signInAs(student)
    let polls = 0
    server.use(
      http.get(`${API}/orders/ORD-2026-000001`, () => {
        polls++
        return HttpResponse.json({ data: makeOrder(polls > 1 ? 'paid' : 'pending') })
      }),
    )
    renderApp('/payment/success?order=ORD-2026-000001')

    expect(await screen.findByRole('heading', { name: /جارٍ تأكيد عملية الدفع/ })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /تم الدفع بنجاح/ }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ابدأ التعلّم' })).toHaveAttribute('href', '/dashboard/courses')
    expect(screen.getByRole('link', { name: 'عرض الفاتورة' })).toHaveAttribute('href', '/dashboard/invoices/INV-2026-000001')
  })

  it('offers a retry after a failed payment', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/orders/ORD-2026-000001`, () => HttpResponse.json({ data: makeOrder('failed') })),
      http.post(`${API}/payments/myfatoorah/create`, () =>
        HttpResponse.json({ data: { order_number: 'ORD-2026-000001', payment_url: 'https://pay.example/retry' } }),
      ),
    )
    const { user } = renderApp('/payment/failed?order=ORD-2026-000001')

    expect(await screen.findByRole('heading', { name: 'لم تكتمل عملية الدفع' })).toBeInTheDocument()
    expect(await screen.findByText('فشل الدفع')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(redirectToPayment).toHaveBeenCalledWith('https://pay.example/retry'))
  })
})

describe('student orders, invoices and courses', () => {
  it('lists orders and cancels an unpaid one', async () => {
    signInAs(student)
    let cancelled = false
    server.use(
      http.get(`${API}/orders`, () =>
        HttpResponse.json({ ...emptyPage, data: [makeOrder('pending')], meta: { ...emptyPage.meta, total: 1 } }),
      ),
      http.get(`${API}/orders/ORD-2026-000001`, () => HttpResponse.json({ data: makeOrder(cancelled ? 'cancelled' : 'pending') })),
      http.post(`${API}/orders/ORD-2026-000001/cancel`, () => {
        cancelled = true
        return HttpResponse.json({ message: 'تم إلغاء الطلب.', data: makeOrder('cancelled') })
      }),
    )
    const { user } = renderApp('/dashboard/orders')

    const row = (await screen.findByRole('link', { name: 'ORD-2026-000001' })).closest('tr')!
    expect(within(row).getByText('بانتظار الدفع')).toBeInTheDocument()
    await user.click(within(row).getByRole('link', { name: 'ORD-2026-000001' }))

    expect(await screen.findByRole('heading', { name: 'الطلب ORD-2026-000001' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إكمال الدفع' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إلغاء الطلب' }))
    expect(await screen.findByText('ملغي')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إكمال الدفع' })).not.toBeInTheDocument()
  })

  it("shows 404 for someone else's order", async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/orders/ORD-2026-000009`, () =>
        HttpResponse.json({ message: 'غير موجود', code: 'not_found' }, { status: 404 }),
      ),
    )
    renderApp('/dashboard/orders/ORD-2026-000009')
    expect(await screen.findByRole('heading', { name: 'لم نعثر على هذه الصفحة' })).toBeInTheDocument()
  })

  it('renders a printable tax invoice', async () => {
    signInAs(student)
    server.use(http.get(`${API}/invoices/INV-2026-000001`, () => HttpResponse.json({ data: invoice })))
    renderApp('/dashboard/invoices/INV-2026-000001')

    expect(await screen.findByRole('heading', { name: 'فاتورة ضريبية مبسّطة' })).toBeInTheDocument()
    expect(screen.getByText('300000000000003')).toBeInTheDocument()
    expect(screen.getByText('ORD-2026-000001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /طباعة/ })).toBeInTheDocument()
  })

  it('shows enrollments on my courses and the dashboard home', async () => {
    signInAs(student)
    server.use(http.get(`${API}/enrollments`, () => HttpResponse.json({ data: [makeEnrollment()] })))
    const { router } = renderApp('/dashboard/courses')

    expect(await screen.findByRole('heading', { name: 'تأسيس القسم الكمي' })).toBeInTheDocument()
    expect(screen.getByText(/81 يوماً متبقية/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ابدأ التعلّم' })).toBeInTheDocument()

    await router.navigate('/dashboard')
    expect(await screen.findByRole('link', { name: 'ابدأ التعلّم' })).toBeInTheDocument()
    expect(screen.queryByText('لا توجد اشتراكات فعّالة بعد')).not.toBeInTheDocument()
  })
})
