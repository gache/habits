import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import HabitGrid, { groupByFrequency, resolveDragReorder } from '../HabitGrid'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Leer',
    description: '30 minutos',
    frequency: 'daily',
    active: true,
    icon: '📚',
    color: '#b8d8a8',
    order: 1,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

describe('HabitGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Wednesday, July 8 2026 — mid-month, so both past and future days exist.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 8))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one row per habit with its name and a header cell per day of the month', () => {
    render(
      <HabitGrid
        habits={[makeHabit()]}
        year={2026}
        month={7}
        completions={[]}
        onToggle={vi.fn()}
      />,
      { wrapper: wrapper() },
    )

    expect(screen.getByText(/Leer/)).toBeInTheDocument()
    // July has 31 days — one column header per day, plus the TOTAL header.
    for (const day of [1, 15, 31]) {
      expect(screen.getByRole('columnheader', { name: String(day) })).toBeInTheDocument()
    }
    expect(screen.getByRole('columnheader', { name: 'TOTAL' })).toBeInTheDocument()
  })

  it('calls onToggle when clicking an enabled past day cell', async () => {
    const onToggle = vi.fn()
    render(
      <HabitGrid
        habits={[makeHabit()]}
        year={2026}
        month={7}
        completions={[]}
        onToggle={onToggle}
      />,
      { wrapper: wrapper() },
    )

    const cell = screen.getByRole('button', { name: /2026-07-05, no completado/ })
    cell.click()
    expect(onToggle).toHaveBeenCalledWith('h1', '2026-07-05', false)
  })

  it('disables future day cells and does not call onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(
      <HabitGrid
        habits={[makeHabit()]}
        year={2026}
        month={7}
        completions={[]}
        onToggle={onToggle}
      />,
      { wrapper: wrapper() },
    )

    const cell = screen.getByRole('button', { name: /2026-07-20, no completado/ })
    expect(cell).toBeDisabled()
    cell.click()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('renders a completed day with a checked accessible label', () => {
    const completions: Completion[] = [{ id: 'c1', habit_id: 'h1', date: '2026-07-05', created_at: null }]
    render(
      <HabitGrid
        habits={[makeHabit()]}
        year={2026}
        month={7}
        completions={completions}
        onToggle={vi.fn()}
      />,
      { wrapper: wrapper() },
    )

    expect(screen.getByRole('button', { name: /2026-07-05, completado/ })).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no habits', () => {
    render(
      <HabitGrid habits={[]} year={2026} month={7} completions={[]} onToggle={vi.fn()} />,
      { wrapper: wrapper() },
    )

    expect(screen.getByText(/Aún no hay hábitos/)).toBeInTheDocument()
  })

  it('shows an error message instead of the grid when isError is true', () => {
    render(
      <HabitGrid habits={[]} year={2026} month={7} completions={[]} isError onToggle={vi.fn()} />,
      { wrapper: wrapper() },
    )

    expect(screen.getByText(/No se pudieron cargar los hábitos/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('mocks api so no real network calls happen', () => {
    expect(api.get).not.toHaveBeenCalled()
  })

  it('renders a category header row per non-empty frequency group, in fixed order', () => {
    const daily = makeHabit({ id: 'd1', name: 'Leer', frequency: 'daily' })
    const monthly = makeHabit({ id: 'm1', name: 'Pagar Renta', frequency: 'monthly' })
    render(
      <HabitGrid
        habits={[monthly, daily]}
        year={2026}
        month={7}
        completions={[]}
        onToggle={vi.fn()}
      />,
      { wrapper: wrapper() },
    )

    const headers = screen.getAllByText(/^(Diario|Semanal|Fin de semana|Mensual)$/, { selector: 'td.bg-gray-50' })
    expect(headers.map((el) => el.textContent)).toEqual(['Diario', 'Mensual'])
  })

  it('omits category headers for frequencies with no habits', () => {
    render(
      <HabitGrid
        habits={[makeHabit({ frequency: 'daily' })]}
        year={2026}
        month={7}
        completions={[]}
        onToggle={vi.fn()}
      />,
      { wrapper: wrapper() },
    )

    expect(screen.queryByText('Semanal')).not.toBeInTheDocument()
    expect(screen.queryByText('Fin de semana')).not.toBeInTheDocument()
    expect(screen.queryByText('Mensual')).not.toBeInTheDocument()
  })

  it('still renders every habit row under its category', () => {
    const daily = makeHabit({ id: 'd1', name: 'Leer', frequency: 'daily' })
    const weekend = makeHabit({ id: 'we1', name: 'Limpiar', frequency: 'weekend' })
    render(
      <HabitGrid
        habits={[daily, weekend]}
        year={2026}
        month={7}
        completions={[]}
        onToggle={vi.fn()}
      />,
      { wrapper: wrapper() },
    )

    expect(screen.getByText(/Leer/)).toBeInTheDocument()
    expect(screen.getByText(/Limpiar/)).toBeInTheDocument()
  })
})

describe('groupByFrequency', () => {
  it('buckets habits by frequency in fixed category order', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const weekly = makeHabit({ id: 'w1', frequency: 'weekly' })
    const weekend = makeHabit({ id: 'we1', frequency: 'weekend' })
    const monthly = makeHabit({ id: 'm1', frequency: 'monthly' })

    const groups = groupByFrequency([monthly, weekend, weekly, daily])

    expect(groups.map((g) => g.freq)).toEqual(['daily', 'weekly', 'weekend', 'monthly'])
    expect(groups[0].habits).toEqual([daily])
    expect(groups[1].habits).toEqual([weekly])
    expect(groups[2].habits).toEqual([weekend])
    expect(groups[3].habits).toEqual([monthly])
  })

  it('omits categories with no habits', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const groups = groupByFrequency([daily])
    expect(groups).toEqual([{ freq: 'daily', habits: [daily] }])
  })

  it('preserves relative order of habits within a category', () => {
    const first = makeHabit({ id: 'd1', frequency: 'daily' })
    const second = makeHabit({ id: 'd2', frequency: 'daily' })
    const groups = groupByFrequency([second, first])
    expect(groups[0].habits.map((h) => h.id)).toEqual(['d2', 'd1'])
  })

  it('returns an empty array for an empty habit list', () => {
    expect(groupByFrequency([])).toEqual([])
  })
})

describe('resolveDragReorder', () => {
  it('reorders when active and over share the same frequency', () => {
    const a = makeHabit({ id: 'd1', frequency: 'daily' })
    const b = makeHabit({ id: 'd2', frequency: 'daily' })
    const c = makeHabit({ id: 'd3', frequency: 'daily' })

    const result = resolveDragReorder([a, b, c], 'd3', 'd1')

    expect(result?.map((h) => h.id)).toEqual(['d3', 'd1', 'd2'])
  })

  it('returns null when active and over have different frequencies', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const weekly = makeHabit({ id: 'w1', frequency: 'weekly' })

    expect(resolveDragReorder([daily, weekly], 'd1', 'w1')).toBeNull()
  })

  it('returns null when activeId is not found', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    expect(resolveDragReorder([daily], 'missing', 'd1')).toBeNull()
  })

  it('returns null when overId is not found', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    expect(resolveDragReorder([daily], 'd1', 'missing')).toBeNull()
  })

  it('preserves relative order of habits from other categories', () => {
    const d1 = makeHabit({ id: 'd1', frequency: 'daily' })
    const w1 = makeHabit({ id: 'w1', frequency: 'weekly' })
    const d2 = makeHabit({ id: 'd2', frequency: 'daily' })
    const w2 = makeHabit({ id: 'w2', frequency: 'weekly' })
    const d3 = makeHabit({ id: 'd3', frequency: 'daily' })
    // Dragging d1 (first daily) to sit after d3 (last daily) should leave
    // w1/w2 exactly where they were, with d1 now last among the dailies.
    const result = resolveDragReorder([d1, w1, d2, w2, d3], 'd1', 'd3')
    expect(result?.map((h) => h.id)).toEqual(['w1', 'd2', 'w2', 'd3', 'd1'])
  })
})
