import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HabitReportCard from '../HabitReportCard'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
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
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('HabitReportCard', () => {
  it('shows 100% for a fully-completed past month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    const completions: Completion[] = Array.from({ length: 31 }, (_, i) => ({
      id: `c${i}`,
      habit_id: 'h1',
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      created_at: null,
    }))
    render(
      <HabitReportCard
        habit={makeHabit()}
        monthStr="2026-07"
        monthCompletions={completions}
        streakCompletions={completions}
        daysElapsed={31}
      />,
    )
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('lists missed days for a daily habit with zero completions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    render(
      <HabitReportCard
        habit={makeHabit()}
        monthStr="2026-07"
        monthCompletions={[]}
        streakCompletions={[]}
        daysElapsed={31}
      />,
    )
    expect(screen.getByText(/Días fallados:/)).toBeInTheDocument()
  })

  it('does not show a missed-periods line for monthly habits', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    render(
      <HabitReportCard
        habit={makeHabit({ frequency: 'monthly' })}
        monthStr="2026-07"
        monthCompletions={[]}
        streakCompletions={[]}
        daysElapsed={31}
      />,
    )
    expect(screen.queryByText(/Días fallados:|Semanas falladas:/)).not.toBeInTheDocument()
  })

  it('shows the current and best streak', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    const completions: Completion[] = [
      { id: 'c1', habit_id: 'h1', date: '2026-07-30', created_at: null },
      { id: 'c2', habit_id: 'h1', date: '2026-07-31', created_at: null },
    ]
    render(
      <HabitReportCard
        habit={makeHabit()}
        monthStr="2026-07"
        monthCompletions={completions}
        streakCompletions={completions}
        daysElapsed={31}
      />,
    )
    expect(screen.getByText(/Racha: 2 días/)).toBeInTheDocument()
    expect(screen.getByText(/Mejor: 2 días/)).toBeInTheDocument()
  })
})
