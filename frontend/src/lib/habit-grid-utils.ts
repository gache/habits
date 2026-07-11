import { type Habit } from '@/hooks/useHabits'
import { reorderHabits } from '@/lib/reorder'

export const CATEGORY_ORDER = ['daily', 'weekly', 'weekend', 'monthly'] as const

export function groupByFrequency(habits: Habit[]) {
  return CATEGORY_ORDER
    .map((freq) => ({ freq, habits: habits.filter((h) => h.frequency === freq) }))
    .filter((g) => g.habits.length > 0)
}

export function resolveDragReorder(habits: Habit[], activeId: string, overId: string): Habit[] | null {
  const activeHabit = habits.find((h) => h.id === activeId)
  const overHabit = habits.find((h) => h.id === overId)
  if (!activeHabit || !overHabit || activeHabit.frequency !== overHabit.frequency) return null
  const fromIndex = habits.findIndex((h) => h.id === activeId)
  const toIndex = habits.findIndex((h) => h.id === overId)
  return reorderHabits(habits, fromIndex, toIndex)
}
