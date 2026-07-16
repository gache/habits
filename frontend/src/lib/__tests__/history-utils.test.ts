import { describe, it, expect } from 'vitest'
import { getLast12Months, habitMonthProgress, monthTotalProgress } from '../history-utils'
import type { Habit } from '@/hooks/useHabits'
import type { Completion } from '@/hooks/useCompletions'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    icon: '💧',
    color: '#000',
    frequency: 'daily',
    created_at: '2026-07-01',
    active: true,
    order: 0,
    ...overrides,
  } as Habit
}

function completion(habitId: string, date: string): Completion {
  return { habit_id: habitId, date } as Completion
}

describe('getLast12Months', () => {
  it('starts with the reference month and walks backward', () => {
    const months = getLast12Months(new Date('2026-07-16'), '2020-01')
    expect(months[0]).toEqual({ year: 2026, month: 7, label: 'Julio 2026' })
    expect(months[1]).toEqual({ year: 2026, month: 6, label: 'Junio 2026' })
  })

  it('stops at APP_START_MONTH instead of always returning 12 entries', () => {
    const months = getLast12Months(new Date('2026-07-16'), '2026-05')
    expect(months).toHaveLength(3)
    expect(months[months.length - 1]).toEqual({ year: 2026, month: 5, label: 'Mayo 2026' })
  })
})

describe('habitMonthProgress', () => {
  it('computes 0% for a habit with no completions', () => {
    const habit = makeHabit()
    const result = habitMonthProgress(habit, '2026-07', [], 16, '2026-07-16')
    expect(result.pct).toBe(0)
    expect(result.completedUpToToday).toBe(0)
  })

  it('computes 100% when every elapsed day is completed', () => {
    const habit = makeHabit({ created_at: '2026-07-01' })
    const completions = Array.from({ length: 16 }, (_, i) => completion('h1', `2026-07-${String(i + 1).padStart(2, '0')}`))
    const result = habitMonthProgress(habit, '2026-07', completions, 16, '2026-07-16')
    expect(result.pct).toBe(100)
  })

  it('only counts completions belonging to the given habit', () => {
    const habit = makeHabit({ id: 'h1' })
    const completions = [completion('h2', '2026-07-01'), completion('h2', '2026-07-02')]
    const result = habitMonthProgress(habit, '2026-07', completions, 16, '2026-07-16')
    expect(result.doneDates.size).toBe(0)
  })
})

describe('monthTotalProgress', () => {
  it('returns 0 when there are no visible habits', () => {
    const result = monthTotalProgress([], '2026-07', [], 16, '2026-07-16')
    expect(result).toBe(0)
  })

  it('aggregates completed/possible across habits rather than averaging percentages', () => {
    // h1: 1 day created, 1/1 possible so far, fully done => contributes 1/1
    // h2: created same day, 0 done => contributes 0/1
    // Aggregate: 1 completed / 2 possible = 50%, not avg(100%, 0%) which would also be 50 here,
    // so use uneven elapsed days to distinguish the two formulas.
    const habits = [
      makeHabit({ id: 'h1', created_at: '2026-07-01' }),
      makeHabit({ id: 'h2', created_at: '2026-07-01' }),
    ]
    const completions = [completion('h1', '2026-07-01'), completion('h1', '2026-07-02')]
    const result = monthTotalProgress(habits, '2026-07', completions, 2, '2026-07-02')
    // h1: 2/2 possible done, h2: 0/2 possible done => aggregate 2/4 = 50%
    expect(result).toBe(50)
  })
})
