import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import Report from '../Report'
import { type Habit } from '@/hooks/useHabits'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const HABIT: Habit = {
  id: 'h1',
  name: 'Leer',
  description: null,
  frequency: 'daily',
  active: true,
  icon: '📚',
  color: '#b8d8a8',
  order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
}

describe('Report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Deliberately not calling vi.useFakeTimers() here: with fake timers
    // enabled, jsdom's missing MessageChannel forces React's scheduler to
    // fall back to setTimeout, which fake timers mock — and
    // @testing-library/dom's waitFor/findBy* only auto-advances timers when
    // it detects a global `jest` (see jestFakeTimersAreEnabled in
    // @testing-library/dom/dist/helpers.js), not vitest's `vi`. The net
    // effect is the mocked API response never finishes flushing to the DOM
    // and every findByText call hangs until vitest's test timeout.
    // vi.setSystemTime() alone still pins "now" for Report.tsx without that
    // deadlock.
    vi.setSystemTime(new Date(2026, 6, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one card per active habit and the trend chart', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [HABIT] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
    expect(screen.getByText(/TENDENCIA/)).toBeInTheDocument()
  })

  it('shows the empty state when there are no habits', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Aún no hay hábitos/)).toBeInTheDocument()
  })

  it('does not render a card for a habit created after the selected month', async () => {
    const futureHabit: Habit = { ...HABIT, id: 'h2', name: 'Futuro', created_at: '2026-08-01T00:00:00Z' }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [HABIT, futureHabit] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
    expect(screen.queryByText(/Futuro/)).not.toBeInTheDocument()
  })

  it('renders a card for a habit backfilled with completions before its created_at month', async () => {
    // Reproduces a real bug: the backend allows marking any past date
    // regardless of created_at, so a habit "created" in July can have real
    // June completions. The selected-month filter must trust that data,
    // not hide the card just because created_at says the habit is newer.
    const backfilledHabit: Habit = { ...HABIT, id: 'h2', name: 'Retro', created_at: '2026-07-07T00:00:00Z' }
    vi.mocked(api.get).mockImplementation((url: string, config?: { params?: { month?: string } }) => {
      if (url === '/api/habits') return Promise.resolve({ data: [backfilledHabit] })
      if (url === '/api/completions') {
        if (config?.params?.month === '2026-06') {
          return Promise.resolve({ data: [{ id: 'c1', habit_id: 'h2', date: '2026-06-15', created_at: null }] })
        }
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })
    await screen.findByText(/TENDENCIA/)

    const prevMonthButton = screen.getByRole('button', { name: /Mes anterior/ })
    prevMonthButton.click()

    expect(await screen.findByText(/Retro/)).toBeInTheDocument()
  })

  it('does not render a card for a habit excluded from the selected month', async () => {
    const excludedHabit: Habit = { ...HABIT, id: 'h2', name: 'Excluido', excluded_months: ['2026-07'] }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [HABIT, excludedHabit] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
    expect(screen.queryByText(/Excluido/)).not.toBeInTheDocument()
  })
})
