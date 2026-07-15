import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as store from '../demo-store'

describe('demo-store habits', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the seed habits when nothing is stored yet', () => {
    const habits = store.listHabits()
    expect(habits.length).toBeGreaterThan(0)
    expect(habits.every((h) => h.active)).toBe(true)
  })

  it('filters by active when requested', () => {
    const created = store.createHabit({ name: 'Inactivo', active: false })
    const active = store.listHabits(true)
    const inactive = store.listHabits(false)
    expect(active.find((h) => h.id === created.id)).toBeUndefined()
    expect(inactive.find((h) => h.id === created.id)).toEqual(created)
  })

  it('creates a habit with sane defaults and persists it', () => {
    const habit = store.createHabit({ name: 'Nuevo hábito' })
    expect(habit.name).toBe('Nuevo hábito')
    expect(habit.frequency).toBe('daily')
    expect(habit.active).toBe(true)
    expect(store.listHabits().find((h) => h.id === habit.id)).toEqual(habit)
  })

  it('updates a habit and bumps updated_at', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'))
    const habit = store.createHabit({ name: 'Original' })
    vi.setSystemTime(new Date('2026-07-02T00:00:00Z'))

    const updated = store.updateHabit(habit.id, { name: 'Renombrado' })

    expect(updated.name).toBe('Renombrado')
    expect(updated.updated_at).not.toBe(habit.updated_at)
    vi.useRealTimers()
  })
})

describe('demo-store month-scoped exclude/restore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('excludeHabitFromMonth adds the month to excluded_months without deleting the habit', () => {
    const habit = store.createHabit({ name: 'Correr' })

    store.excludeHabitFromMonth(habit.id, '2026-07')

    const stillThere = store.listHabits().find((h) => h.id === habit.id)
    expect(stillThere).toBeDefined()
    expect(stillThere?.excluded_months).toEqual(['2026-07'])
  })

  it('excludeHabitFromMonth removes only that month\'s completions for the habit', () => {
    const habit = store.createHabit({ name: 'Correr' })
    store.markComplete(habit.id, '2026-07-01')
    store.markComplete(habit.id, '2026-08-01')

    store.excludeHabitFromMonth(habit.id, '2026-07')

    expect(store.listCompletions('2026-07').some((c) => c.habit_id === habit.id)).toBe(false)
    expect(store.listCompletions('2026-08').some((c) => c.habit_id === habit.id)).toBe(true)
  })

  it('excludeHabitFromMonth is idempotent', () => {
    const habit = store.createHabit({ name: 'Correr' })

    store.excludeHabitFromMonth(habit.id, '2026-07')
    store.excludeHabitFromMonth(habit.id, '2026-07')

    const found = store.listHabits().find((h) => h.id === habit.id)
    expect(found?.excluded_months).toEqual(['2026-07'])
  })

  it('restoreHabit un-excludes the month and re-adds the given completions', () => {
    const habit = store.createHabit({ name: 'Correr' })
    store.excludeHabitFromMonth(habit.id, '2026-07')

    store.restoreHabit(habit.id, '2026-07', ['2026-07-01', '2026-07-02'])

    const found = store.listHabits().find((h) => h.id === habit.id)
    expect(found?.excluded_months).toEqual([])
    const dates = store.listCompletions('2026-07').filter((c) => c.habit_id === habit.id).map((c) => c.date)
    expect(dates.sort()).toEqual(['2026-07-01', '2026-07-02'])
  })

  it('restoreHabit does not duplicate a completion that already exists', () => {
    const habit = store.createHabit({ name: 'Correr' })
    store.markComplete(habit.id, '2026-07-01')

    store.restoreHabit(habit.id, '2026-07', ['2026-07-01'])

    const matching = store.listCompletions('2026-07').filter((c) => c.habit_id === habit.id && c.date === '2026-07-01')
    expect(matching).toHaveLength(1)
  })
})

describe('demo-store completions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists completions for the given month only', () => {
    const habit = store.createHabit({ name: 'Correr' })
    store.markComplete(habit.id, '2026-07-05')
    store.markComplete(habit.id, '2026-08-05')

    const forHabit = store.listCompletions('2026-07').filter((c) => c.habit_id === habit.id)
    expect(forHabit).toHaveLength(1)
  })

  it('markComplete does not create a duplicate for an already-completed date', () => {
    const habit = store.createHabit({ name: 'Correr' })
    const first = store.markComplete(habit.id, '2026-07-05')
    const second = store.markComplete(habit.id, '2026-07-05')

    expect(second).toEqual(first)
    const forHabit = store.listCompletions('2026-07').filter((c) => c.habit_id === habit.id)
    expect(forHabit).toHaveLength(1)
  })

  it('unmarkComplete removes only the matching habit/date pair', () => {
    const habit = store.createHabit({ name: 'Correr' })
    store.markComplete(habit.id, '2026-07-05')
    store.markComplete(habit.id, '2026-07-06')

    store.unmarkComplete(habit.id, '2026-07-05')

    const dates = store.listCompletions('2026-07').filter((c) => c.habit_id === habit.id).map((c) => c.date)
    expect(dates).toEqual(['2026-07-06'])
  })
})

describe('demo-store monthly log', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null for a month with no log', () => {
    expect(store.getMonthlyLog('2026-07')).toBeNull()
  })

  it('upsertMonthlyLog creates a log on first call and merges on later calls', () => {
    store.upsertMonthlyLog('2026-07', { goal: 'Leer más' })
    const updated = store.upsertMonthlyLog('2026-07', { notes: 'Buen mes' })

    expect(updated).toEqual({
      month: '2026-07',
      goal: 'Leer más',
      notes: 'Buen mes',
      reflection_well: '',
      reflection_improve: '',
      reflection_proud: '',
    })
  })
})
