import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import History from '../History'
import { type Habit } from '@/hooks/useHabits'
import { type MonthlyLog } from '@/hooks/useMonthlyLog'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

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

const EMPTY_LOG: MonthlyLog = {
  month: '',
  goal: '',
  notes: '',
  reflection_well: '',
  reflection_improve: '',
  reflection_proud: '',
}

function mockApi({
  habits = [HABIT],
  completionsByMonth = {},
  logByMonth = {},
}: {
  habits?: Habit[]
  completionsByMonth?: Record<string, unknown[]>
  logByMonth?: Record<string, Partial<MonthlyLog>>
} = {}) {
  vi.mocked(api.get).mockImplementation((url: string, config?: { params?: { month?: string } }) => {
    if (url === '/api/habits') return Promise.resolve({ data: habits })
    const month = config?.params?.month ?? ''
    if (url === '/api/completions') return Promise.resolve({ data: completionsByMonth[month] ?? [] })
    if (url === '/api/monthly-log') return Promise.resolve({ data: { ...EMPTY_LOG, month, ...logByMonth[month] } })
    return Promise.reject(new Error(`unexpected url ${url}`))
  })
}

describe('History', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(new Date(2026, 6, 15)) // July 15, 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a card for the current month and its detail panel', async () => {
    mockApi()
    render(<History />, { wrapper: wrapper() })

    expect(await screen.findByText('Julio 2026')).toBeInTheDocument()
    expect(await screen.findByText(/JULIO 2026/)).toBeInTheDocument()
  })

  it('switches the detail panel when a different month card is clicked', async () => {
    mockApi()
    render(<History />, { wrapper: wrapper() })

    await screen.findByText(/JULIO 2026/)
    screen.getByText('Junio 2026').closest('button')!.click()

    expect(await screen.findByText(/JUNIO 2026/)).toBeInTheDocument()
  })

  it('shows the habit row in the selected month heatmap', async () => {
    mockApi()
    render(<History />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
  })

  it('shows a placeholder when the month has no written reflection', async () => {
    mockApi()
    render(<History />, { wrapper: wrapper() })

    expect(await screen.findByText('No hay reflexión escrita para este mes.')).toBeInTheDocument()
  })

  it('shows the written goal for the selected month', async () => {
    mockApi({ logByMonth: { '2026-07': { goal: 'Leer 10 páginas al día' } } })
    render(<History />, { wrapper: wrapper() })

    expect((await screen.findAllByText('Leer 10 páginas al día')).length).toBeGreaterThan(0)
  })

  it('navigates back to the tracker when the back button is clicked', async () => {
    mockApi()
    render(<History />, { wrapper: wrapper() })

    await screen.findByText(/JULIO 2026/)
    screen.getByRole('button', { name: 'Volver al Tracker' }).click()

    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})
