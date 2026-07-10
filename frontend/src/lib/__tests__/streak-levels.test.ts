import { describe, it, expect } from 'vitest'
import { getStreakLevel, getNextStreakLevel, periodUnitLabel } from '../streak-levels'

describe('getStreakLevel', () => {
  it('returns null below the first tier', () => {
    expect(getStreakLevel(0, 'daily')).toBeNull()
    expect(getStreakLevel(2, 'daily')).toBeNull()
  })

  it('returns the matching tier at its exact threshold', () => {
    expect(getStreakLevel(3, 'daily')?.label).toBe('En racha')
    expect(getStreakLevel(7, 'daily')?.label).toBe('Una semana fuerte')
    expect(getStreakLevel(100, 'daily')?.label).toBe('Racha centenaria')
  })

  it('returns the highest tier reached, not the lowest', () => {
    expect(getStreakLevel(50, 'daily')?.label).toBe('Un mes de racha')
  })

  it('caps at the top tier for streaks beyond it', () => {
    expect(getStreakLevel(500, 'daily')?.label).toBe('Racha centenaria')
  })

  it('uses a separate, smaller tier ladder for weekly habits', () => {
    // 7 periods clears daily's "Una semana fuerte" tier but is well below
    // weekly's own thresholds — each frequency's ladder is independent.
    expect(getStreakLevel(2, 'weekly')?.label).toBe('En racha')
    expect(getStreakLevel(4, 'weekly')?.label).toBe('Un mes de constancia')
    expect(getStreakLevel(52, 'weekly')?.label).toBe('Un año sin fallar')
    expect(getStreakLevel(1, 'weekly')).toBeNull()
  })

  it('gives monthly habits the smallest period-counts of all four ladders', () => {
    expect(getStreakLevel(2, 'monthly')?.label).toBe('En racha')
    expect(getStreakLevel(12, 'monthly')?.label).toBe('Un año sin fallar')
  })

  it('gives weekend the same period-counts as weekly, worded differently', () => {
    expect(getStreakLevel(4, 'weekend')?.label).toBe('Un mes de constancia')
  })
})

describe('getNextStreakLevel', () => {
  it('returns the first tier when below it', () => {
    expect(getNextStreakLevel(0, 'daily')?.label).toBe('En racha')
  })

  it('returns the tier right above the current one', () => {
    expect(getNextStreakLevel(3, 'daily')?.label).toBe('Una semana fuerte')
    expect(getNextStreakLevel(6, 'daily')?.label).toBe('Una semana fuerte')
  })

  it('returns null once past the top tier', () => {
    expect(getNextStreakLevel(100, 'daily')).toBeNull()
    expect(getNextStreakLevel(500, 'daily')).toBeNull()
  })

  it('uses the monthly ladder for monthly habits', () => {
    expect(getNextStreakLevel(1, 'monthly')?.label).toBe('En racha')
    expect(getNextStreakLevel(2, 'monthly')?.label).toBe('Un trimestre completo')
    expect(getNextStreakLevel(36, 'monthly')).toBeNull()
  })
})

describe('periodUnitLabel', () => {
  it('pluralizes each frequency correctly', () => {
    expect(periodUnitLabel('daily', 1)).toBe('día')
    expect(periodUnitLabel('daily', 3)).toBe('días')
    expect(periodUnitLabel('weekly', 1)).toBe('semana')
    expect(periodUnitLabel('weekly', 2)).toBe('semanas')
    expect(periodUnitLabel('monthly', 1)).toBe('mes')
    expect(periodUnitLabel('monthly', 2)).toBe('meses')
    expect(periodUnitLabel('weekend', 1)).toBe('fin de semana')
    expect(periodUnitLabel('weekend', 2)).toBe('fines de semana')
  })
})
