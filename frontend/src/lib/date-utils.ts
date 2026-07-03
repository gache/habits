/** Shared date helpers — used by HabitRow, HabitGrid, WeeklyProgress, Tracker */

export function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Today as "YYYY-MM-DD" */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Days a habit could have been completed within a given month, capped to
 * daysElapsed. Accounts for habits created partway through the month so
 * progress denominators aren't inflated by days before the habit existed.
 */
export function habitDaysElapsed(
  createdAt: string | null,
  monthStr: string, // "YYYY-MM"
  daysElapsed: number,
): number {
  if (!createdAt) return daysElapsed
  const createdDate = createdAt.slice(0, 10) // "YYYY-MM-DD"
  const createdMonth = createdDate.slice(0, 7)
  if (createdMonth < monthStr) return daysElapsed
  if (createdMonth > monthStr) return 0
  const startDay = parseInt(createdDate.slice(8, 10), 10)
  return Math.max(0, daysElapsed - startDay + 1)
}

/**
 * Current streak: how many consecutive days ending on or before today
 * have a completion for this habit.
 */
export function calcStreak(completedDates: Set<string>): number {
  const today = new Date()
  let streak = 0
  const d = new Date(today)
  while (true) {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    if (!completedDates.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/**
 * Longest run of consecutive-day completions found anywhere in the given
 * dates — unlike calcStreak, doesn't need to end today. Used for lifetime
 * "best streak" records.
 */
export function calcBestStreak(completedDates: Set<string>): number {
  if (completedDates.size === 0) return 0
  const sorted = [...completedDates].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    run = dayDiff === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}
