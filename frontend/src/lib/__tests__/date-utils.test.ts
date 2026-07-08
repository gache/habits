import { describe, it, expect } from 'vitest'
import { pad, getDaysInMonth, habitDaysElapsed, habitPeriodsElapsed, calcStreak, calcBestStreak, periodBounds, isPeriodLocked, isWeekday, isWeekend, countCompletedPeriods, dayChunks } from '../date-utils'

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

describe('calcStreak', () => {
  it('returns 0 for no completions', () => {
    expect(calcStreak(new Set())).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const today = new Date()
    const dates = new Set<string>()
    for (let i = 0; i < 3; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dates.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    }
    expect(calcStreak(dates)).toBe(3)
  })

  it('does not zero out streak if today is not yet completed', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dates = new Set<string>([
      `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`,
    ])
    expect(calcStreak(dates)).toBe(1)
  })
})

describe('calcBestStreak', () => {
  it('returns 0 for no completions', () => {
    expect(calcBestStreak(new Set())).toBe(0)
  })

  it('finds the longest consecutive run anywhere in the set', () => {
    const dates = new Set([
      '2026-01-01', '2026-01-02', '2026-01-03',
      '2026-02-10',
      '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05',
    ])
    expect(calcBestStreak(dates)).toBe(5)
  })
})
