import type { Habit } from '@/hooks/useHabits'
import type { Completion } from '@/hooks/useCompletions'
import { pad, habitDaysElapsed, habitPeriodsElapsed, countCompletedPeriods, APP_START_MONTH } from '@/lib/date-utils'

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function getLast12Months(referenceDate: Date, startMonth: string = APP_START_MONTH): { year: number; month: number; label: string }[] {
  const result = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1)
    const monthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    if (monthStr < startMonth) break
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    })
  }
  return result
}

export interface HabitMonthProgress {
  doneDates: Set<string>
  completedUpToToday: number
  effectivePeriods: number
  pct: number
}

export function habitMonthProgress(
  habit: Habit,
  monthStr: string,
  completions: Completion[],
  daysElapsed: number,
  today: string,
): HabitMonthProgress {
  const doneDates = new Set(completions.filter((c) => c.habit_id === habit.id).map((c) => c.date))
  const completedUpToToday = countCompletedPeriods(habit.frequency, doneDates, today)
  const effectivePeriods = habitPeriodsElapsed(
    habit.frequency,
    habitDaysElapsed(habit.created_at, monthStr, daysElapsed, doneDates.size > 0),
  )
  const pct = effectivePeriods > 0 ? Math.min(100, Math.round((completedUpToToday / effectivePeriods) * 100)) : 0
  return { doneDates, completedUpToToday, effectivePeriods, pct }
}

export function monthTotalProgress(
  habits: Habit[],
  monthStr: string,
  completions: Completion[],
  daysElapsed: number,
  today: string,
): number {
  let totalPossible = 0
  let totalCompleted = 0
  for (const h of habits) {
    const { completedUpToToday, effectivePeriods } = habitMonthProgress(h, monthStr, completions, daysElapsed, today)
    totalPossible += effectivePeriods
    totalCompleted += completedUpToToday
  }
  return totalPossible > 0 ? Math.min(100, Math.round((totalCompleted / totalPossible) * 100)) : 0
}
