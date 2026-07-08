import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import HabitRow from '../HabitRow'
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

function renderRow(habit: Habit, props: Partial<Parameters<typeof HabitRow>[0]> = {}) {
  const days = [1, 2, 3, 4, 5]
  return render(
    <DndContext onDragEnd={() => {}}>
      <table>
        <SortableContext items={[habit.id]} strategy={verticalListSortingStrategy}>
          <tbody>
            <HabitRow
              habit={habit}
              days={days}
              monthStr="2026-07"
              today="2026-07-05"
              totalDays={5}
              completions={[]}
              mobileVisibleDays={new Set(days)}
              onToggle={vi.fn()}
              {...props}
            />
          </tbody>
        </SortableContext>
      </table>
    </DndContext>,
    { wrapper: wrapper() },
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

describe('HabitRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the frequency badge matching the habit frequency', () => {
    renderRow(makeHabit({ frequency: 'monthly' }))
    expect(screen.getByText(/Mensual/)).toBeInTheDocument()
  })

  it('shows the objetivo line when the habit has a description', () => {
    renderRow(makeHabit({ description: '30 minutos' }))
    expect(screen.getByText(/30 minutos/)).toBeInTheDocument()
  })

  it('does not show an objetivo line when the habit has no description', () => {
    renderRow(makeHabit({ description: null }))
    expect(screen.queryByText(/⏱/)).not.toBeInTheDocument()
  })

  it('does not show a streak line when the current streak is zero', () => {
    renderRow(makeHabit(), { completions: [] })
    expect(screen.queryByText(/Racha/)).not.toBeInTheDocument()
  })

  it('shows a streak line when there is an active streak', () => {
    // calcStreak reads the real clock, not the `today` prop, so pin it to
    // match the completion dates below.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 5))
    const completions: Completion[] = [
      { id: 'c1', habit_id: 'h1', date: '2026-07-04', created_at: null },
      { id: 'c2', habit_id: 'h1', date: '2026-07-05', created_at: null },
    ]
    renderRow(makeHabit(), { completions, today: '2026-07-05' })
    vi.useRealTimers()
    expect(screen.getByText(/Racha: 2 días/)).toBeInTheDocument()
  })

  it('counts a streak that started last month using streakCompletions, not the month-scoped completions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 1)) // July 1st
    // completions is scoped to July only (as the real month-fetched prop
    // would be) — it alone can't see the June 30th completion that keeps
    // the streak alive across the boundary.
    const completions: Completion[] = [
      { id: 'c1', habit_id: 'h1', date: '2026-07-01', created_at: null },
    ]
    const streakCompletions: Completion[] = [
      { id: 'c0', habit_id: 'h1', date: '2026-06-30', created_at: null },
      ...completions,
    ]
    renderRow(makeHabit(), { completions, streakCompletions, today: '2026-07-01' })
    vi.useRealTimers()
    expect(screen.getByText(/Racha: 2 días/)).toBeInTheDocument()
  })

  it('opens the edit modal when the edit button is clicked', () => {
    renderRow(makeHabit())
    fireEvent.click(screen.getByLabelText('Editar Leer'))
    expect(screen.getByText('Editar Hábito')).toBeInTheDocument()
  })

  it('archives the habit (active: false) when the archive button is clicked', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: makeHabit({ active: false }) })
    renderRow(makeHabit())
    fireEvent.click(screen.getByLabelText('Archivar Leer'))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/habits/h1', { active: false }))
  })

  it('shows a delete confirmation dialog when the delete button is clicked', () => {
    renderRow(makeHabit())
    fireEvent.click(screen.getByLabelText('Eliminar Leer'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/Eliminar "Leer"/)).toBeInTheDocument()
  })

  it('cancelling the delete confirmation keeps the row and does not delete', () => {
    renderRow(makeHabit())
    fireEvent.click(screen.getByLabelText('Eliminar Leer'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api.delete).not.toHaveBeenCalled()
  })
})
