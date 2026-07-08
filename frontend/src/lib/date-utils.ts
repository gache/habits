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
 * daysElapsed. Any day up to today can be backfilled regardless of the
 * exact day the habit was created — this only zeroes out months entirely
 * outside the habit's lifetime (e.g. viewing a month before it existed).
 */
export function habitDaysElapsed(
  createdAt: string | null,
  monthStr: string, // "YYYY-MM"
  daysElapsed: number,
): number {
  if (!createdAt) return daysElapsed
  const createdMonth = createdAt.slice(0, 7)
  return createdMonth <= monthStr ? daysElapsed : 0
}

/**
 * Converts a habit's elapsed days (from habitDaysElapsed) into elapsed
 * periods for its frequency — a weekly habit only has one "possible slot"
 * per 7-day chunk, a monthly habit only one per month, so counting raw days
 * as the % denominator would make a perfectly-kept monthly habit look like
 * it's at ~3%.
 */
export function habitPeriodsElapsed(
  frequency: 'daily' | 'weekly' | 'monthly',
  daysElapsed: number,
): number {
  if (daysElapsed <= 0) return 0
  if (frequency === 'monthly') return 1
  if (frequency === 'weekly') return Math.ceil(daysElapsed / 7)
  return daysElapsed
}

/** Whether `date` ("YYYY-MM-DD") falls on Monday-Friday. */
export function isWeekday(date: string): boolean {
  // Parsed as local midnight (not UTC) so the day-of-week matches what the
  // date string says regardless of the viewer's timezone offset.
  const day = new Date(`${date}T00:00:00`).getDay() // 0=Sun .. 6=Sat
  return day >= 1 && day <= 5
}

/**
 * Inclusive [start, end] date-string bounds for the period containing
 * `date`, for frequencies that only allow one completion per period.
 * Weekly uses the real ISO calendar week (Monday-Sunday) — weekly habits
 * are only checkable Monday-Friday (see isWeekday), so the period must
 * span the actual week those weekdays belong to — mirrors
 * backend/date_utils.py. Returns null for "daily", which has no period
 * restriction.
 */
export function periodBounds(
  frequency: 'daily' | 'weekly' | 'monthly',
  date: string, // "YYYY-MM-DD"
): [string, string] | null {
  if (frequency === 'monthly') {
    const month = date.slice(0, 7)
    return [`${month}-01`, `${month}-32`]
  }
  if (frequency === 'weekly') {
    const d = new Date(`${date}T00:00:00`)
    const dayOfWeek = d.getDay() // 0=Sun .. 6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(d)
    monday.setDate(d.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
    return [fmt(monday), fmt(sunday)]
  }
  return null
}

/**
 * Whether a not-yet-completed date should be locked because another date in
 * the same period (month) already has a completion for this habit — only
 * monthly habits allow just one check per period. Weekly habits allow a
 * check on any weekday (Mon-Fri, see isWeekday) within the same week.
 */
export function isPeriodLocked(
  frequency: 'daily' | 'weekly' | 'monthly',
  date: string,
  completedDates: Set<string>,
): boolean {
  if (frequency !== 'monthly') return false
  if (completedDates.has(date)) return false
  const bounds = periodBounds(frequency, date)
  if (!bounds) return false
  const [start, end] = bounds
  for (const d of completedDates) {
    if (d >= start && d <= end) return true
  }
  return false
}

/**
 * Counts completions toward progress %, collapsing multiple completions in
 * the same period (week for weekly habits) into one — a weekly habit
 * checked on both Monday and Wednesday of the same week still only
 * represents one fulfilled week.
 */
export function countCompletedPeriods(
  frequency: 'daily' | 'weekly' | 'monthly',
  completedDates: Set<string>,
  today: string,
): number {
  const past = [...completedDates].filter((d) => d <= today)
  if (frequency === 'daily') return past.length
  const periodKeys = new Set(past.map((d) => periodBounds(frequency, d)![0]))
  return periodKeys.size
}

/**
 * Groups a month's day numbers into ISO-week (Monday-Sunday) chunks — used
 * to show just one week at a time on narrow screens, so a day grid and its
 * total column fit without horizontal scroll.
 */
export function weekChunks(monthStr: string, days: number[]): number[][] {
  const groups = new Map<string, number[]>()
  for (const day of days) {
    const dateStr = `${monthStr}-${pad(day)}`
    const [mondayKey] = periodBounds('weekly', dateStr)!
    if (!groups.has(mondayKey)) groups.set(mondayKey, [])
    groups.get(mondayKey)!.push(day)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
}

/**
 * Current streak: how many consecutive days ending on or before today
 * have a completion for this habit.
 */
export function calcStreak(completedDates: Set<string>): number {
  const d = new Date()
  const todayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  // Today isn't over yet — if it's not done, don't zero out an otherwise-alive
  // streak; start counting from yesterday and only break if that's missing too.
  if (!completedDates.has(todayKey)) d.setDate(d.getDate() - 1)

  let streak = 0
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
