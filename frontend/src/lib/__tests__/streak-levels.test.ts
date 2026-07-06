import { describe, it, expect } from 'vitest'
import { getStreakLevel } from '../streak-levels'

describe('getStreakLevel', () => {
  it('returns null below the first tier', () => {
    expect(getStreakLevel(0)).toBeNull()
    expect(getStreakLevel(2)).toBeNull()
  })

  it('returns the matching tier at its exact threshold', () => {
    expect(getStreakLevel(3)?.label).toBe('En racha')
    expect(getStreakLevel(7)?.label).toBe('Una semana fuerte')
    expect(getStreakLevel(100)?.label).toBe('Racha centenaria')
  })

  it('returns the highest tier reached, not the lowest', () => {
    expect(getStreakLevel(50)?.label).toBe('Un mes de racha')
  })

  it('caps at the top tier for streaks beyond it', () => {
    expect(getStreakLevel(500)?.label).toBe('Racha centenaria')
  })
})
