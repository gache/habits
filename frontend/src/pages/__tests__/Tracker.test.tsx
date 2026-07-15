import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import Tracker from '../Tracker'
import { type Habit } from '@/hooks/useHabits'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const signOutMock = vi.fn()
vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}))
vi.mock('@/lib/firebase', () => ({ auth: {} }))

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

function mockApi({
  habits = [HABIT],
  completions = [],
  log = { month: '2026-07', goal: '', notes: '', reflection_well: '', reflection_improve: '', reflection_proud: '' },
}: { habits?: Habit[]; completions?: unknown[]; log?: object } = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/api/habits') return Promise.resolve({ data: habits })
    if (url === '/api/completions') return Promise.resolve({ data: completions })
    if (url === '/api/monthly-log') return Promise.resolve({ data: log })
    return Promise.reject(new Error(`unexpected url ${url}`))
  })
}

describe('Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    vi.setSystemTime(new Date(2026, 6, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the habit list once loaded', async () => {
    mockApi()
    render(<Tracker />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
  })

  it('toggles dark mode and persists the preference', async () => {
    mockApi()
    render(<Tracker />, { wrapper: wrapper() })
    await screen.findByText(/Leer/)

    screen.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('darkMode')).toBe('true')
  })

  it('shows a restore button for habits excluded from the current month', async () => {
    const excluded: Habit = { ...HABIT, id: 'h2', name: 'Pausado', excluded_months: ['2026-07'] }
    mockApi({ habits: [HABIT, excluded] })
    render(<Tracker />, { wrapper: wrapper() })

    await screen.findByText(/Leer/)
    expect(screen.getByText(/Pausado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Restaurar/ })).toBeInTheDocument()
  })

  it('calls the restore endpoint when the restore button is clicked', async () => {
    const excluded: Habit = { ...HABIT, id: 'h2', name: 'Pausado', excluded_months: ['2026-07'] }
    mockApi({ habits: [HABIT, excluded] })
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<Tracker />, { wrapper: wrapper() })

    await screen.findByText(/Leer/)
    screen.getByRole('button', { name: /Restaurar/ }).click()

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/habits/h2/restore', { month: '2026-07', dates: [] })
    })
  })

  it('signs out when the sign-out button is clicked', async () => {
    mockApi()
    render(<Tracker />, { wrapper: wrapper() })
    await screen.findByText(/Leer/)

    screen.getByRole('button', { name: 'Cerrar sesión' }).click()

    expect(signOutMock).toHaveBeenCalled()
  })

  it('disables the previous-month button at the app start month', async () => {
    mockApi()
    vi.setSystemTime(new Date(2026, 0, 15)) // January 2026 = APP_START_MONTH
    render(<Tracker />, { wrapper: wrapper() })
    await screen.findByText(/Leer/)

    expect(screen.getByRole('button', { name: /Mes anterior/ })).toBeDisabled()
  })

  it('opens the add-habit modal when the add button is clicked', async () => {
    mockApi()
    render(<Tracker />, { wrapper: wrapper() })
    await screen.findByText(/Leer/)

    screen.getByRole('button', { name: 'Agregar hábito' }).click()

    expect(await screen.findByText(/Agregar Nuevo Hábito/)).toBeInTheDocument()
  })
})
