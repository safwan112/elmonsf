import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

describe('theme', () => {
  it('switches to dark mode and remembers the choice', async () => {
    const { user } = renderApp('/')

    await user.click((await screen.findAllByRole('button', { name: 'تغيير المظهر' }))[0]!)
    await user.click(await screen.findByRole('menuitemradio', { name: 'داكن' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
