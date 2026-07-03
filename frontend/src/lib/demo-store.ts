/**
 * In-memory store for demo mode.
 * Data is kept in localStorage so it survives page refreshes.
 */

import type { Habit, HabitCreate, HabitUpdate } from '@/hooks/useHabits'
import type { Completion } from '@/hooks/useCompletions'
import type { MonthlyLog } from '@/hooks/useMonthlyLog'

// ─── seed data ───────────────────────────────────────────────────────────────

const SEED_HABITS: Habit[] = [
  { id: 'h1', name: 'DRINK WATER', description: '8 glasses', frequency: 'daily', active: true, icon: '💧', color: '#a8d8ea', order: 0, created_at: null, updated_at: null },
  { id: 'h2', name: 'EXERCISE',    description: '30 min',    frequency: 'daily', active: true, icon: '🏃', color: '#b8e0b8', order: 1, created_at: null, updated_at: null },
  { id: 'h3', name: 'READ',        description: '20 pages',  frequency: 'daily', active: true, icon: '📚', color: '#d4a8d4', order: 2, created_at: null, updated_at: null },
  { id: 'h4', name: 'MEDITATE',    description: '10 min',    frequency: 'daily', active: true, icon: '🧘', color: '#f0e0a0', order: 3, created_at: null, updated_at: null },
]

/** Generate seed completions for the last N months so history page has data */
function buildSeedCompletions(): Completion[] {
  const completions: Completion[] = []
  const rng = (seed: number) => ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff
  const habits = SEED_HABITS
  const today = new Date()

  for (let mOffset = 5; mOffset >= 0; mOffset--) {
    const d = new Date(today.getFullYear(), today.getMonth() - mOffset, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const daysInMonth = new Date(year, month, 0).getDate()
    const lastDay = mOffset === 0 ? today.getDate() : daysInMonth

    habits.forEach((habit, hi) => {
      // Each habit has a different "compliance rate" per month
      const rate = 0.5 + rng(hi * 31 + mOffset * 7) * 0.45
      for (let day = 1; day <= lastDay; day++) {
        const shouldComplete = rng(hi * 100 + mOffset * 50 + day) < rate
        if (shouldComplete) {
          const mm = month.toString().padStart(2, '0')
          const dd = day.toString().padStart(2, '0')
          completions.push({
            id: `seed-${habit.id}-${year}-${mm}-${dd}`,
            habit_id: habit.id,
            date: `${year}-${mm}-${dd}`,
            created_at: null,
          })
        }
      }
    })
  }
  return completions
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() {
  return Math.random().toString(36).slice(2)
}

// ─── habits ──────────────────────────────────────────────────────────────────

function getHabits(): Habit[] {
  return load<Habit[]>('demo:habits', SEED_HABITS)
}

function saveHabits(habits: Habit[]) {
  save('demo:habits', habits)
}

export function listHabits(active?: boolean): Habit[] {
  const habits = getHabits()
  return active !== undefined ? habits.filter((h) => h.active === active) : habits
}

export function createHabit(body: HabitCreate): Habit {
  const habit: Habit = {
    id: uid(),
    name: body.name,
    description: body.description ?? null,
    frequency: body.frequency ?? 'daily',
    active: body.active ?? true,
    icon: body.icon ?? '⭐',
    color: body.color ?? '#a8d8ea',
    order: body.order ?? getHabits().length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  saveHabits([...getHabits(), habit])
  return habit
}

export function updateHabit(id: string, updates: HabitUpdate): Habit {
  const habits = getHabits().map((h) =>
    h.id === id ? { ...h, ...updates, updated_at: new Date().toISOString() } : h,
  )
  saveHabits(habits)
  return habits.find((h) => h.id === id)!
}

export function deleteHabit(id: string): void {
  saveHabits(getHabits().filter((h) => h.id !== id))
}

// ─── completions ─────────────────────────────────────────────────────────────

function getCompletions(): Completion[] {
  return load<Completion[]>('demo:completions', buildSeedCompletions())
}

function saveCompletions(completions: Completion[]) {
  save('demo:completions', completions)
}

export function listCompletions(month: string): Completion[] {
  return getCompletions().filter((c) => c.date.startsWith(month))
}

export function markComplete(habitId: string, date: string): Completion {
  const existing = getCompletions().find((c) => c.habit_id === habitId && c.date === date)
  if (existing) return existing
  const completion: Completion = { id: uid(), habit_id: habitId, date, created_at: new Date().toISOString() }
  saveCompletions([...getCompletions(), completion])
  return completion
}

export function unmarkComplete(habitId: string, date: string): void {
  saveCompletions(getCompletions().filter((c) => !(c.habit_id === habitId && c.date === date)))
}

// ─── monthly log ─────────────────────────────────────────────────────────────

export function getMonthlyLog(month: string): MonthlyLog | null {
  return load<MonthlyLog | null>(`demo:log:${month}`, null)
}

export function upsertMonthlyLog(month: string, updates: Partial<MonthlyLog>): MonthlyLog {
  const existing = getMonthlyLog(month) ?? { month, goal: '', notes: '', reflection_well: '', reflection_improve: '', reflection_proud: '' }
  const updated = { ...existing, ...updates, month }
  save(`demo:log:${month}`, updated)
  return updated
}
