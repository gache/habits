import { describe, it, expect } from 'vitest'
import { computeDayCellState, computeMilestoneUpdate } from '../habit-row-utils'

describe('computeDayCellState', () => {
  it('disables a future date with no completion', () => {
    const result = computeDayCellState('daily', '2026-07-20', '2026-07-16', new Set())
    expect(result).toEqual({ isDisabled: true, disabledReason: 'future' })
  })

  it('allows a future date that is already completed', () => {
    const result = computeDayCellState('daily', '2026-07-20', '2026-07-16', new Set(['2026-07-20']))
    expect(result.isDisabled).toBe(false)
  })

  it('disables a weekend date for a weekly habit with no completion', () => {
    // 2026-07-11 is a Saturday, before the '2026-07-16' today so it isn't a future date too
    const result = computeDayCellState('weekly', '2026-07-11', '2026-07-16', new Set())
    expect(result).toEqual({ isDisabled: true, disabledReason: 'weekend' })
  })

  it('disables a weekday date for a weekend habit with no completion', () => {
    // 2026-07-16 is a Thursday
    const result = computeDayCellState('weekend', '2026-07-16', '2026-07-16', new Set())
    expect(result).toEqual({ isDisabled: true, disabledReason: 'weekday' })
  })

  it('disables a monthly date when another date in the same month is already completed', () => {
    const result = computeDayCellState('monthly', '2026-07-10', '2026-07-16', new Set(['2026-07-05']))
    expect(result).toEqual({ isDisabled: true, disabledReason: 'period-locked' })
  })

  it('enables a past, uncompleted, unrestricted date', () => {
    const result = computeDayCellState('daily', '2026-07-10', '2026-07-16', new Set())
    expect(result.isDisabled).toBe(false)
  })
})

describe('computeMilestoneUpdate', () => {
  it('returns no milestone when best streak has no matching level', () => {
    const result = computeMilestoneUpdate({
      frequency: 'daily',
      bestStreak: 1,
      lastBest: 0,
      lastCelebrated: 0,
    })
    expect(result.milestone).toBeNull()
  })

  it('flags forgetPrevious when the best streak dropped since last seen', () => {
    const result = computeMilestoneUpdate({
      frequency: 'daily',
      bestStreak: 2,
      lastBest: 5,
      lastCelebrated: 3,
    })
    expect(result.forgetPrevious).toBe(true)
  })

  it('does not flag forgetPrevious when the best streak held or grew', () => {
    const result = computeMilestoneUpdate({
      frequency: 'daily',
      bestStreak: 5,
      lastBest: 5,
      lastCelebrated: 3,
    })
    expect(result.forgetPrevious).toBe(false)
  })

  it('celebrates every 3rd day for a daily habit past the last celebrated value', () => {
    const result = computeMilestoneUpdate({
      frequency: 'daily',
      bestStreak: 6,
      lastBest: 5,
      lastCelebrated: 3,
    })
    expect(result.milestone).not.toBeNull()
    expect(result.newCelebratedValue).toBe(6)
  })

  it('does not celebrate a daily streak that is not a multiple of 3', () => {
    const result = computeMilestoneUpdate({
      frequency: 'daily',
      bestStreak: 4,
      lastBest: 3,
      lastCelebrated: 3,
    })
    expect(result.milestone).toBeNull()
  })

  it('can re-celebrate a tier this run when the streak just dropped and rebuilt to it', () => {
    // lastCelebrated=6 (stale, from before the drop) would normally block a
    // re-celebration at streak 6 — but since bestStreak (6) < lastBest (8),
    // forgetPrevious resets the gate for this same computation.
    const result = computeMilestoneUpdate({
      frequency: 'daily',
      bestStreak: 6,
      lastBest: 8,
      lastCelebrated: 6,
    })
    expect(result.forgetPrevious).toBe(true)
    expect(result.milestone).not.toBeNull()
    expect(result.newCelebratedValue).toBe(6)
  })

  it('celebrates a weekly habit when it crosses a new ladder tier', () => {
    const result = computeMilestoneUpdate({
      frequency: 'weekly',
      bestStreak: 3,
      lastBest: 2,
      lastCelebrated: 0,
    })
    expect(result.milestone).not.toBeNull()
    expect(result.newCelebratedValue).toBe(result.milestone?.level.periods)
  })
})
