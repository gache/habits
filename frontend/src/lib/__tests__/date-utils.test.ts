import { describe, it, expect, vi, afterEach } from 'vitest'
import { pad, getDaysInMonth, habitDaysElapsed, habitPeriodsElapsed, calcPeriodStreak, calcBestPeriodStreak, periodBounds, isPeriodLocked, isWeekday, isWeekend, countCompletedPeriods, dayChunks, recentMonthStrs, APP_START_MONTH } from '../date-utils'

afterEach(() => {
  vi.useRealTimers()
})

describe('pad', () => {
  it('pads single digits with a leading zero', () => {
    expect(pad(5)).toBe('05')
  })

  it('leaves double digits unchanged', () => {
    expect(pad(12)).toBe('12')
  })
})

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29)
  })
})

describe('recentMonthStrs', () => {
  it('returns the requested count when well within app history', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15)) // July 15 2026
    expect(recentMonthStrs(3)).toEqual(['2026-07', '2026-06', '2026-05'])
  })

  it('stops at APP_START_MONTH instead of going further back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15)) // March 15 2026 — only Mar/Feb/Jan 2026 exist
    const months = recentMonthStrs(12)
    expect(months).toEqual(['2026-03', '2026-02', '2026-01'])
    expect(months.every((m) => m >= APP_START_MONTH)).toBe(true)
  })
})

describe('habitDaysElapsed', () => {
  it('returns full daysElapsed when createdAt is null', () => {
    expect(habitDaysElapsed(null, '2026-07', 15)).toBe(15)
  })

  it('returns full daysElapsed when habit created in an earlier month', () => {
    expect(habitDaysElapsed('2026-06-10T00:00:00Z', '2026-07', 15)).toBe(15)
  })

  it('returns 0 when habit created in a later month', () => {
    expect(habitDaysElapsed('2026-08-01T00:00:00Z', '2026-07', 15)).toBe(0)
  })

  it('returns full daysElapsed when habit created within the same month (backfill allowed)', () => {
    expect(habitDaysElapsed('2026-07-10T00:00:00Z', '2026-07', 15)).toBe(15)
  })

  it('returns 0 when habit created later and hasCompletions is false', () => {
    expect(habitDaysElapsed('2026-08-01T00:00:00Z', '2026-07', 15, false)).toBe(0)
  })

  it('returns full daysElapsed when habit created later but hasCompletions is true (backfilled before creation)', () => {
    expect(habitDaysElapsed('2026-08-01T00:00:00Z', '2026-07', 15, true)).toBe(15)
  })
})

describe('habitPeriodsElapsed', () => {
  it('returns 0 when no days have elapsed', () => {
    expect(habitPeriodsElapsed('daily', 0)).toBe(0)
    expect(habitPeriodsElapsed('weekly', 0)).toBe(0)
    expect(habitPeriodsElapsed('monthly', 0)).toBe(0)
  })

  it('daily counts every elapsed day', () => {
    expect(habitPeriodsElapsed('daily', 15)).toBe(15)
  })

  it('weekly counts elapsed 7-day chunks, rounding up a partial one', () => {
    expect(habitPeriodsElapsed('weekly', 7)).toBe(1)
    expect(habitPeriodsElapsed('weekly', 8)).toBe(2)
    expect(habitPeriodsElapsed('weekly', 15)).toBe(3)
  })

  it('weekend counts elapsed 7-day chunks same as weekly', () => {
    expect(habitPeriodsElapsed('weekend', 7)).toBe(1)
    expect(habitPeriodsElapsed('weekend', 8)).toBe(2)
  })

  it('monthly is a single period regardless of how many days elapsed', () => {
    expect(habitPeriodsElapsed('monthly', 1)).toBe(1)
    expect(habitPeriodsElapsed('monthly', 31)).toBe(1)
  })
})

describe('periodBounds', () => {
  it('returns null for daily', () => {
    expect(periodBounds('daily', '2026-07-15')).toBeNull()
  })

  it('spans the whole month for monthly', () => {
    expect(periodBounds('monthly', '2026-07-15')).toEqual(['2026-07-01', '2026-07-32'])
  })

  it('spans the real ISO week (Monday-Sunday) for weekly', () => {
    expect(periodBounds('weekly', '2026-07-02')).toEqual(['2026-06-29', '2026-07-05']) // Thursday
    expect(periodBounds('weekly', '2026-07-08')).toEqual(['2026-07-06', '2026-07-12']) // Wednesday
    expect(periodBounds('weekly', '2026-07-05')).toEqual(['2026-06-29', '2026-07-05']) // Sunday
    expect(periodBounds('weekly', '2026-07-06')).toEqual(['2026-07-06', '2026-07-12']) // Monday
  })

  it('spans the real ISO week (Monday-Sunday) for weekend, same as weekly', () => {
    expect(periodBounds('weekend', '2026-07-04')).toEqual(['2026-06-29', '2026-07-05']) // Saturday
    expect(periodBounds('weekend', '2026-07-05')).toEqual(['2026-06-29', '2026-07-05']) // Sunday
  })
})

describe('isWeekday', () => {
  it('is true for Monday through Friday', () => {
    expect(isWeekday('2026-07-06')).toBe(true) // Monday
    expect(isWeekday('2026-07-10')).toBe(true) // Friday
  })

  it('is false for Saturday and Sunday', () => {
    expect(isWeekday('2026-07-04')).toBe(false) // Saturday
    expect(isWeekday('2026-07-05')).toBe(false) // Sunday
  })
})

describe('isWeekend', () => {
  it('is true for Saturday and Sunday', () => {
    expect(isWeekend('2026-07-04')).toBe(true) // Saturday
    expect(isWeekend('2026-07-05')).toBe(true) // Sunday
  })

  it('is false for Monday through Friday', () => {
    expect(isWeekend('2026-07-06')).toBe(false) // Monday
    expect(isWeekend('2026-07-10')).toBe(false) // Friday
  })
})

describe('isPeriodLocked', () => {
  it('is never locked for daily habits', () => {
    expect(isPeriodLocked('daily', '2026-07-05', new Set(['2026-07-01']))).toBe(false)
  })

  it('never locks a weekly habit — any weekday in the week stays available', () => {
    expect(isPeriodLocked('weekly', '2026-07-02', new Set(['2026-07-02']))).toBe(false)
    expect(isPeriodLocked('weekly', '2026-07-03', new Set(['2026-07-02']))).toBe(false)
  })

  it('never locks a weekend habit — both Saturday and Sunday stay available', () => {
    expect(isPeriodLocked('weekend', '2026-07-05', new Set(['2026-07-04']))).toBe(false)
  })

  it('locks the whole month for a monthly habit', () => {
    expect(isPeriodLocked('monthly', '2026-07-28', new Set(['2026-07-05']))).toBe(true)
  })
})

describe('countCompletedPeriods', () => {
  it('counts every date for daily habits', () => {
    expect(countCompletedPeriods('daily', new Set(['2026-07-01', '2026-07-02']), '2026-07-31')).toBe(2)
  })

  it('collapses multiple weekday checks in the same week into one', () => {
    expect(countCompletedPeriods('weekly', new Set(['2026-07-01', '2026-07-02']), '2026-07-31')).toBe(1)
  })

  it('counts separate weeks individually', () => {
    expect(countCompletedPeriods('weekly', new Set(['2026-07-02', '2026-07-08']), '2026-07-31')).toBe(2)
  })

  it('collapses a Saturday+Sunday weekend check into one period', () => {
    expect(countCompletedPeriods('weekend', new Set(['2026-07-04', '2026-07-05']), '2026-07-31')).toBe(1)
  })

  it('excludes dates after today', () => {
    expect(countCompletedPeriods('daily', new Set(['2026-07-01', '2026-08-01']), '2026-07-31')).toBe(1)
  })

  it('counts one per month for monthly habits', () => {
    expect(countCompletedPeriods('monthly', new Set(['2026-07-05']), '2026-07-31')).toBe(1)
  })
})

describe('dayChunks', () => {
  it('splits days into fixed-size pages of 5', () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1)
    const chunks = dayChunks(days)
    expect(chunks[0]).toEqual([1, 2, 3, 4, 5])
    expect(chunks[1]).toEqual([6, 7, 8, 9, 10])
    expect(chunks[chunks.length - 1]).toEqual([31])
  })

  it('keeps every day exactly once across all chunks', () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1)
    const chunks = dayChunks(days)
    expect(chunks.flat()).toEqual(days)
  })

  it('supports a custom page size', () => {
    expect(dayChunks([1, 2, 3, 4, 5, 6, 7], 7)).toEqual([[1, 2, 3, 4, 5, 6, 7]])
  })
})

describe('calcPeriodStreak', () => {
  it('returns 0 for no completions', () => {
    expect(calcPeriodStreak('daily', new Set())).toBe(0)
  })

  it('daily: counts consecutive days ending today', () => {
    const today = new Date()
    const dates = new Set<string>()
    for (let i = 0; i < 3; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dates.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    }
    expect(calcPeriodStreak('daily', dates)).toBe(3)
  })

  it('daily: does not zero out streak if today is not yet completed', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dates = new Set<string>([
      `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`,
    ])
    expect(calcPeriodStreak('daily', dates)).toBe(1)
  })

  it('weekly: counts consecutive weeks (any weekday) ending on the current week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 8)) // Wednesday, July 8 2026
    // This week (Mon Jul 6) + last week (Mon Jun 29) both have a check, on
    // different weekdays — still counts as 2 consecutive weekly periods.
    const dates = new Set(['2026-07-06', '2026-06-30'])
    expect(calcPeriodStreak('weekly', dates)).toBe(2)
    vi.useRealTimers()
  })

  it('weekly: does not zero out streak if the current week is not yet completed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 8)) // Wednesday, current week has no check yet
    const dates = new Set(['2026-06-30']) // last week only
    expect(calcPeriodStreak('weekly', dates)).toBe(1)
    vi.useRealTimers()
  })

  it('weekly: breaks on a missed week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 8))
    const dates = new Set(['2026-07-06', '2026-06-15']) // this week + two weeks ago, gap in between
    expect(calcPeriodStreak('weekly', dates)).toBe(1)
    vi.useRealTimers()
  })

  it('monthly: counts consecutive months ending on the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15)) // July 2026
    const dates = new Set(['2026-07-02', '2026-06-20', '2026-05-01'])
    expect(calcPeriodStreak('monthly', dates)).toBe(3)
    vi.useRealTimers()
  })

  it('monthly: does not zero out streak if the current month is not yet completed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15))
    const dates = new Set(['2026-06-20'])
    expect(calcPeriodStreak('monthly', dates)).toBe(1)
    vi.useRealTimers()
  })

  it('weekend: counts consecutive weekends the same way weekly counts weeks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 8))
    const dates = new Set(['2026-07-05', '2026-06-28']) // Sunday this week + last week
    expect(calcPeriodStreak('weekend', dates)).toBe(2)
    vi.useRealTimers()
  })
})

describe('calcBestPeriodStreak', () => {
  it('returns 0 for no completions', () => {
    expect(calcBestPeriodStreak('daily', new Set())).toBe(0)
  })

  it('daily: finds the longest consecutive run anywhere in the set', () => {
    const dates = new Set([
      '2026-01-01', '2026-01-02', '2026-01-03',
      '2026-02-10',
      '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05',
    ])
    expect(calcBestPeriodStreak('daily', dates)).toBe(5)
  })

  it('weekly: finds the longest run of consecutive weeks, collapsing same-week dates', () => {
    const dates = new Set([
      '2026-06-15', '2026-06-17', // same week (Mon Jun 15)
      '2026-06-22', // next week
      '2026-07-13', // unrelated later week, breaks the run
    ])
    expect(calcBestPeriodStreak('weekly', dates)).toBe(2)
  })

  it('monthly: finds the longest run of consecutive months', () => {
    const dates = new Set(['2026-01-05', '2026-02-01', '2026-03-20', '2026-05-01'])
    expect(calcBestPeriodStreak('monthly', dates)).toBe(3)
  })
})
