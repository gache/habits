import { describe, it, expect } from 'vitest'
import { groupByFrequency, resolveDragReorder } from '../habit-grid-utils'
import { type Habit } from '@/hooks/useHabits'

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

describe('groupByFrequency', () => {
  it('buckets habits by frequency in fixed category order', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const weekly = makeHabit({ id: 'w1', frequency: 'weekly' })
    const weekend = makeHabit({ id: 'we1', frequency: 'weekend' })
    const monthly = makeHabit({ id: 'm1', frequency: 'monthly' })

    const groups = groupByFrequency([monthly, weekend, weekly, daily])

    expect(groups.map((g) => g.freq)).toEqual(['daily', 'weekly', 'weekend', 'monthly'])
    expect(groups[0].habits).toEqual([daily])
    expect(groups[1].habits).toEqual([weekly])
    expect(groups[2].habits).toEqual([weekend])
    expect(groups[3].habits).toEqual([monthly])
  })

  it('omits categories with no habits', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const groups = groupByFrequency([daily])
    expect(groups).toEqual([{ freq: 'daily', habits: [daily] }])
  })

  it('preserves relative order of habits within a category', () => {
    const first = makeHabit({ id: 'd1', frequency: 'daily' })
    const second = makeHabit({ id: 'd2', frequency: 'daily' })
    const groups = groupByFrequency([second, first])
    expect(groups[0].habits.map((h) => h.id)).toEqual(['d2', 'd1'])
  })

  it('returns an empty array for an empty habit list', () => {
    expect(groupByFrequency([])).toEqual([])
  })
})

describe('resolveDragReorder', () => {
  it('reorders when active and over share the same frequency', () => {
    const a = makeHabit({ id: 'd1', frequency: 'daily' })
    const b = makeHabit({ id: 'd2', frequency: 'daily' })
    const c = makeHabit({ id: 'd3', frequency: 'daily' })

    const result = resolveDragReorder([a, b, c], 'd3', 'd1')

    expect(result?.map((h) => h.id)).toEqual(['d3', 'd1', 'd2'])
  })

  it('returns null when active and over have different frequencies', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const weekly = makeHabit({ id: 'w1', frequency: 'weekly' })

    expect(resolveDragReorder([daily, weekly], 'd1', 'w1')).toBeNull()
  })

  it('returns null when activeId is not found', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    expect(resolveDragReorder([daily], 'missing', 'd1')).toBeNull()
  })

  it('returns null when overId is not found', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    expect(resolveDragReorder([daily], 'd1', 'missing')).toBeNull()
  })

  it('preserves relative order of habits from other categories', () => {
    const d1 = makeHabit({ id: 'd1', frequency: 'daily' })
    const w1 = makeHabit({ id: 'w1', frequency: 'weekly' })
    const d2 = makeHabit({ id: 'd2', frequency: 'daily' })
    const w2 = makeHabit({ id: 'w2', frequency: 'weekly' })
    const d3 = makeHabit({ id: 'd3', frequency: 'daily' })
    const result = resolveDragReorder([d1, w1, d2, w2, d3], 'd1', 'd3')
    expect(result?.map((h) => h.id)).toEqual(['w1', 'd2', 'w2', 'd3', 'd1'])
  })
})
