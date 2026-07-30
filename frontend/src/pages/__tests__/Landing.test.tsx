import { describe, expect, it, vi } from 'vitest'
import Landing from '@/pages/Landing'
import { PILLARS } from '@/lib/geo'
import { renderWithProviders, screen } from '@/test/utils'

describe('Landing page', () => {
  it('renders the hero and both primary calls to action', async () => {
    // No session cookie in tests: the boot-time refresh should just fail.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))

    await renderWithProviders(<Landing />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/is it citing you/i)
    expect(screen.getByRole('link', { name: /run your free audit/i })).toHaveAttribute(
      'href',
      '/signup',
    )
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0)
  })

  it('documents every scoring pillar with its weight', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await renderWithProviders(<Landing />)

    for (const pillar of PILLARS) {
      expect(screen.getByRole('heading', { name: pillar.name })).toBeInTheDocument()
    }
    // Weights must sum to 100% or the composite score is meaningless.
    const total = PILLARS.reduce((sum, p) => sum + p.weight, 0)
    expect(total).toBeCloseTo(1, 5)
  })

  it('exposes a skip link for keyboard users', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await renderWithProviders(<Landing />)
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
  })
})
