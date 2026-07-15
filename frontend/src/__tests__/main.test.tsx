import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'

vi.mock('../App', () => ({ default: () => <div data-testid="app-marker">app</div> }))

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('main', () => {
  beforeEach(() => {
    vi.resetModules()
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    document.body.innerHTML = '<div id="root"></div>'
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('applies dark mode from the system preference when nothing is stored', async () => {
    mockMatchMedia(true)

    await import('../main')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('stays light when the system prefers light and nothing is stored', async () => {
    mockMatchMedia(false)

    await import('../main')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('lets a stored "true" preference override a light system preference', async () => {
    mockMatchMedia(false)
    localStorage.setItem('darkMode', 'true')

    await import('../main')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('lets a stored "false" preference override a dark system preference', async () => {
    mockMatchMedia(true)
    localStorage.setItem('darkMode', 'false')

    await import('../main')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('renders the App into the #root element', async () => {
    mockMatchMedia(false)

    await act(async () => {
      await import('../main')
    })

    expect(document.getElementById('root')?.textContent).toContain('app')
  })
})
