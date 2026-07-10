import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import {
  pad,
  getDaysInMonth,
  todayStr,
  habitDaysElapsed,
  habitPeriodsElapsed,
  countCompletedPeriods,
  periodBounds,
} from './date-utils'

/**
 * Day-of-month to report through: the full month if `monthStr` is already
 * in the past, or today's date-of-month if it's the current month — can't
 * report on days that haven't happened yet.
 */
function lastReportableDay(monthStr: string): number {
  const today = todayStr()
  const [year, month] = monthStr.split('-').map(Number)
  const isCurrentMonth = monthStr === today.slice(0, 7)
  return isCurrentMonth ? new Date().getDate() : getDaysInMonth(year, month)
}

/**
 * Habits that should be visible for `monthStr` — everything except habits
 * explicitly excluded from that specific month via a month-scoped delete.
 * Doesn't consider `created_at`; callers that also need to hide
 * not-yet-created habits apply that separately.
 */
export function visibleHabitsForMonth(habits: Habit[], monthStr: string): Habit[] {
  return habits.filter((h) => !h.excluded_months?.includes(monthStr))
}

/**
 * Global % of all habits' periods completed for one month — the same
 * formula Tracker.tsx's header badge used to compute inline, factored out
 * here so the monthly report can compute it for every month in its trend
 * window too. Returns `null` when there's nothing to report (no habits, or
 * none created yet as of `monthStr`) — mirrors the original inline calc it
 * replaces. Callers that need a gapless numeric series (like the trend
 * chart) coalesce with `?? 0` themselves.
 */
export function monthlyGlobalPct(habits: Habit[], completions: Completion[], monthStr: string): number | null {
  const today = todayStr()
  const daysElapsed = lastReportableDay(monthStr)
  let totalPossible = 0
  let completedUpToToday = 0
  for (const h of visibleHabitsForMonth(habits, monthStr)) {
    const dates = new Set(
      completions.filter((c) => c.habit_id === h.id && c.date.startsWith(monthStr)).map((c) => c.date),
    )
    totalPossible += habitPeriodsElapsed(h.frequency, habitDaysElapsed(h.created_at, monthStr, daysElapsed, dates.size > 0))
    completedUpToToday += countCompletedPeriods(h.frequency, dates, today)
  }
  return totalPossible > 0 ? Math.min(100, Math.round((completedUpToToday / totalPossible) * 100)) : null
}

/**
 * Periods within `monthStr` that this habit has no completion for — day
 * numbers (as strings) for daily habits, "start-end" day-range labels for
 * weekly/weekend (one entry per missed week). Monthly habits always return
 * `[]` — a single-period-per-month frequency has nothing to list within
 * one month; that's already visible from whether its one period was
 * completed at all.
 */
export function missedPeriods(habit: Habit, completions: Completion[], monthStr: string): string[] {
  if (habit.frequency === 'monthly') return []

  const habitDates = new Set(
    completions.filter((c) => c.habit_id === habit.id && c.date.startsWith(monthStr)).map((c) => c.date),
  )

  if (habit.frequency === 'daily') {
    const lastDay = lastReportableDay(monthStr)
    const missed: string[] = []
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${monthStr}-${pad(day)}`
      if (!habitDates.has(dateStr)) missed.push(String(day))
    }
    return missed
  }

  // weekly / weekend: one entry per week with zero completions anywhere in
  // its bounds.
  const lastDay = lastReportableDay(monthStr)
  const missed: string[] = []
  const seenWeekStarts = new Set<string>()
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${monthStr}-${pad(day)}`
    const [weekStart, weekEnd] = periodBounds(habit.frequency, dateStr)!
    if (seenWeekStarts.has(weekStart)) continue
    seenWeekStarts.add(weekStart)
    const hasCompletion = [...habitDates].some((d) => d >= weekStart && d <= weekEnd)
    if (!hasCompletion) {
      missed.push(`${Number(weekStart.slice(8))}-${Number(weekEnd.slice(8))}`)
    }
  }
  return missed
}

/**
 * Completion rate (0-1) per weekday across `monthStr`, for one habit's
 * already-filtered completions — source data for the daily-habit weekday
 * mini bar chart. `weekday` follows `Date.getDay()` (0=Sun..6=Sat), same as
 * `isWeekday`/`isWeekend` elsewhere in date-utils.ts. Only meaningful for
 * daily habits (weekly/monthly/weekend don't have enough same-weekday data
 * points in one month for a pattern to mean anything) — callers are
 * expected to only call this for daily habits.
 */
export function weekdayPattern(completions: Completion[], monthStr: string): { weekday: number; rate: number }[] {
  const lastDay = lastReportableDay(monthStr)
  const habitDates = new Set(completions.map((c) => c.date))

  const totals = Array.from({ length: 7 }, () => ({ elapsed: 0, completed: 0 }))
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${monthStr}-${pad(day)}`
    const weekday = new Date(`${dateStr}T00:00:00`).getDay()
    totals[weekday].elapsed++
    if (habitDates.has(dateStr)) totals[weekday].completed++
  }
  return totals.map((t, weekday) => ({
    weekday,
    rate: t.elapsed > 0 ? t.completed / t.elapsed : 0,
  }))
}
