import { describe, it, expect, vi, afterEach } from 'vitest'
import { monthlyGlobalPct, missedPeriods, weekdayPattern, visibleHabitsForMonth } from '../report-utils'
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

function makeCompletion(habitId: string, date: string): Completion {
  return { id: `c-${habitId}-${date}`, habit_id: habitId, date, created_at: null }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('monthlyGlobalPct', () => {
  it('returns null when there are no habits', () => {
    expect(monthlyGlobalPct([], [], '2026-06')).toBeNull()
  })

  it('returns 100 for a fully-completed past month', () => {
    const habit = makeHabit({ frequency: 'daily' })
    const completions = Array.from({ length: 30 }, (_, i) =>
      makeCompletion('h1', `2026-06-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-06')).toBe(100)
  })

  it('returns 0 for a past month with zero completions', () => {
    const habit = makeHabit()
    expect(monthlyGlobalPct([habit], [], '2026-06')).toBe(0)
  })

  it('ignores a habit not yet created in that month', () => {
    const habit = makeHabit({ created_at: '2026-07-01T00:00:00Z' })
    expect(monthlyGlobalPct([habit], [], '2026-06')).toBeNull()
  })

  it('counts backfilled completions from before the habit\'s created_at month', () => {
    // The backend lets a habit be marked complete on any past date with no
    // check against created_at, so a habit "created" in July can genuinely
    // have June completions (backfilled at creation time). The month
    // shouldn't be reported as empty just because created_at says otherwise.
    const habit = makeHabit({ frequency: 'daily', created_at: '2026-07-07T00:00:00Z' })
    const completions = Array.from({ length: 30 }, (_, i) =>
      makeCompletion('h1', `2026-06-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-06')).toBe(100)
  })

  it("excludes a habit's contribution for a month it was deleted from", () => {
    const habit = makeHabit({ frequency: 'daily', excluded_months: ['2026-06'] })
    const completions = Array.from({ length: 30 }, (_, i) =>
      makeCompletion('h1', `2026-06-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-06')).toBeNull()
  })

  it('only counts days elapsed so far for the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15)) // July 15 2026
    const habit = makeHabit({ frequency: 'daily' })
    const completions = Array.from({ length: 15 }, (_, i) =>
      makeCompletion('h1', `2026-07-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-07')).toBe(100)
  })
})

describe('visibleHabitsForMonth', () => {
  it('keeps a habit with no excluded_months', () => {
    const habit = makeHabit({ excluded_months: [] })
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([habit])
  })

  it('keeps a habit with excluded_months left undefined', () => {
    const habit = makeHabit()
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([habit])
  })

  it('drops a habit excluded from the given month', () => {
    const habit = makeHabit({ excluded_months: ['2026-07'] })
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([])
  })

  it('keeps a habit excluded from a different month', () => {
    const habit = makeHabit({ excluded_months: ['2026-06'] })
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([habit])
  })
})

describe('missedPeriods', () => {
  it('returns an empty list for monthly habits regardless of completions', () => {
    const habit = makeHabit({ frequency: 'monthly' })
    expect(missedPeriods(habit, [], '2026-06')).toEqual([])
  })

  it('lists missed day numbers for a daily habit in a past month', () => {
    const habit = makeHabit({ frequency: 'daily' })
    // June 2026 has 30 days; complete every day except the 5th and the 20th.
    const completions = Array.from({ length: 30 }, (_, i) => i + 1)
      .filter((day) => day !== 5 && day !== 20)
      .map((day) => makeCompletion('h1', `2026-06-${String(day).padStart(2, '0')}`))
    expect(missedPeriods(habit, completions, '2026-06')).toEqual(['5', '20'])
  })

  it('lists missed weeks for a weekly habit', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 1)) // August 1 2026 — July is now a fully-elapsed past month
    const habit = makeHabit({ frequency: 'weekly' })
    // July 2026: Monday July 6th starts a week. Complete a day in that
    // week, skip the week starting July 13th entirely.
    const completions = [makeCompletion('h1', '2026-07-08')]
    const missed = missedPeriods(habit, completions, '2026-07')
    expect(missed).toContain('13-19')
    expect(missed).not.toContain('6-12')
  })

  it('lists missed weekends for a weekend habit the same way weekly lists weeks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 1)) // August 1 2026 — July is now a fully-elapsed past month
    const habit = makeHabit({ frequency: 'weekend' })
    const completions = [makeCompletion('h1', '2026-07-11')] // Saturday, in the week of the 6th
    const missed = missedPeriods(habit, completions, '2026-07')
    expect(missed).not.toContain('6-12')
    expect(missed).toContain('13-19')
  })
})

describe('weekdayPattern', () => {
  it('returns 7 entries, one per weekday, with rate 0 when nothing completed', () => {
    const result = weekdayPattern([], '2026-06')
    expect(result).toHaveLength(7)
    expect(result.every((r) => r.rate === 0)).toBe(true)
  })

  it('computes the completion rate per weekday for a past month', () => {
    // June 2026: the 1st is a Monday. Complete every Monday, skip everything else.
    const mondays = ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29']
    const completions = mondays.map((d) => makeCompletion('h1', d))
    const result = weekdayPattern(completions, '2026-06')
    const monday = result.find((r) => r.weekday === 1)
    const tuesday = result.find((r) => r.weekday === 2)
    expect(monday?.rate).toBe(1)
    expect(tuesday?.rate).toBe(0)
  })
})
