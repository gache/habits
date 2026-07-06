import { describe, it, expect } from 'vitest'
import { pad, getDaysInMonth, habitDaysElapsed, calcStreak, calcBestStreak } from '../date-utils'

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

  it('caps elapsed days to days since creation within the same month', () => {
    // created on the 10th, 15 days elapsed in month -> 15 - 10 + 1 = 6
    expect(habitDaysElapsed('2026-07-10T00:00:00Z', '2026-07', 15)).toBe(6)
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
