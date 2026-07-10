/** Shared date helpers — used by HabitRow, HabitGrid, WeeklyProgress, Tracker */

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'weekend'

/** The app has no data before this month — nothing older is ever fetched or shown. */
export const APP_START_MONTH = '2026-01'

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
 * "YYYY-MM" for the current month and the `count - 1` months before it,
 * most recent first — used to fetch enough completion history for
 * calcPeriodStreak/calcBestPeriodStreak to see across month boundaries
 * instead of just the single month currently on screen (a streak that
 * started last month would otherwise look broken or shorter than it
 * really is on the 1st).
 */
export function recentMonthStrs(count: number): string[] {
  const today = new Date()
  const months: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    if (monthStr < APP_START_MONTH) break
    months.push(monthStr)
  }
  return months
}

/**
 * Days a habit could have been completed within a given month, capped to
 * daysElapsed. Any day up to today can be backfilled regardless of the
 * exact day the habit was created — this only zeroes out months entirely
 * outside the habit's lifetime (e.g. viewing a month before it existed).
 * `hasCompletions` overrides that zeroing: the backend allows marking any
 * past date without checking `created_at`, so a habit can genuinely have
 * completions in a month before its own creation month (backfilled at
 * creation time) — when that happens, trust the data over the metadata.
 */
export function habitDaysElapsed(
  createdAt: string | null,
  monthStr: string, // "YYYY-MM"
  daysElapsed: number,
  hasCompletions = false,
): number {
  if (!createdAt) return daysElapsed
  const createdMonth = createdAt.slice(0, 7)
  return createdMonth <= monthStr || hasCompletions ? daysElapsed : 0
}

/**
 * Converts a habit's elapsed days (from habitDaysElapsed) into elapsed
 * periods for its frequency — a weekly habit only has one "possible slot"
 * per 7-day chunk, a monthly habit only one per month, so counting raw days
 * as the % denominator would make a perfectly-kept monthly habit look like
 * it's at ~3%.
 */
export function habitPeriodsElapsed(
  frequency: Frequency,
  daysElapsed: number,
): number {
  if (daysElapsed <= 0) return 0
  if (frequency === 'monthly') return 1
  if (frequency === 'weekly' || frequency === 'weekend') return Math.ceil(daysElapsed / 7)
  return daysElapsed
}

/** Whether `date` ("YYYY-MM-DD") falls on Monday-Friday. */
export function isWeekday(date: string): boolean {
  // Parsed as local midnight (not UTC) so the day-of-week matches what the
  // date string says regardless of the viewer's timezone offset.
  const day = new Date(`${date}T00:00:00`).getDay() // 0=Sun .. 6=Sat
  return day >= 1 && day <= 5
}

/** Whether `date` ("YYYY-MM-DD") falls on Saturday or Sunday. */
export function isWeekend(date: string): boolean {
  return !isWeekday(date)
}

/**
 * Inclusive [start, end] date-string bounds for the period containing
 * `date`, for frequencies that only allow one completion per period.
 * Weekly and weekend both use the real ISO calendar week (Monday-Sunday)
 * — weekly habits are only checkable Monday-Friday (see isWeekday) and
 * weekend habits only Saturday-Sunday (see isWeekend), so the period must
 * span the actual week those days belong to — mirrors backend/date_utils.py.
 * Returns null for "daily", which has no period restriction.
 */
export function periodBounds(
  frequency: Frequency,
  date: string, // "YYYY-MM-DD"
): [string, string] | null {
  if (frequency === 'monthly') {
    const month = date.slice(0, 7)
    return [`${month}-01`, `${month}-32`]
  }
  if (frequency === 'weekly' || frequency === 'weekend') {
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
  frequency: Frequency,
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
  frequency: Frequency,
  completedDates: Set<string>,
  today: string,
): number {
  const past = [...completedDates].filter((d) => d <= today)
  if (frequency === 'daily') return past.length
  const periodKeys = new Set(past.map((d) => periodBounds(frequency, d)![0]))
  return periodKeys.size
}

/**
 * Groups a month's day numbers into fixed-size pages (5 days by default) —
 * used to show just one page at a time on narrow screens, so a day grid and
 * its total column fit without horizontal scroll. Fixed-size (rather than
 * ISO-week) chunks keep every page the same width — an ISO week can be 5
 * days (a partial week at the start/end of a month) or 7, and the wider
 * 7-day pages didn't fit as comfortably as the 5-day ones.
 */
export function dayChunks(days: number[], size = 5): number[][] {
  const chunks: number[][] = []
  for (let i = 0; i < days.length; i += size) {
    chunks.push(days.slice(i, i + size))
  }
  return chunks
}

/**
 * Reduces a date to the key identifying its period under `frequency` —
 * the date itself for daily (each day is its own period), and the Monday
 * of its ISO week for weekly/weekend (both use the same weekly cadence,
 * just on different eligible days). Used to turn a set of raw completion
 * dates into a set of *periods* before counting streaks, so a weekly habit
 * checked on both Monday and Wednesday of the same week still only counts
 * as one period toward the streak.
 */
function periodKeyOf(frequency: Frequency, date: string): string {
  if (frequency === 'monthly') return date.slice(0, 7)
  if (frequency === 'weekly' || frequency === 'weekend') return periodBounds(frequency, date)![0]
  return date
}

/**
 * Current streak: how many consecutive periods (days for daily, weeks for
 * weekly/weekend, months for monthly) ending on or before the current one
 * have a completion for this habit — the frequency-aware generalization of
 * "how many in a row." A weekly habit only asks for one check per week, so
 * its streak counts consecutive *weeks* with a check, not consecutive days
 * (which would almost never line up two weeks in a row).
 */
export function calcPeriodStreak(frequency: Frequency, completedDates: Set<string>): number {
  const periods = new Set([...completedDates].map((d) => periodKeyOf(frequency, d)))

  if (frequency === 'monthly') {
    const now = new Date()
    let y = now.getFullYear()
    let m = now.getMonth() // 0-based
    const key = () => `${y}-${pad(m + 1)}`
    const stepBack = () => { m -= 1; if (m < 0) { m = 11; y -= 1 } }
    // Current period isn't over yet — if it's not done, don't zero out an
    // otherwise-alive streak; start counting from the previous period and
    // only break if that's missing too.
    if (!periods.has(key())) stepBack()
    let streak = 0
    while (periods.has(key())) {
      streak++
      stepBack()
    }
    return streak
  }

  const stepDays = frequency === 'daily' ? 1 : 7
  const d = new Date()
  const key = () => periodKeyOf(frequency, `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  if (!periods.has(key())) d.setDate(d.getDate() - stepDays)
  let streak = 0
  while (periods.has(key())) {
    streak++
    d.setDate(d.getDate() - stepDays)
  }
  return streak
}

/**
 * Longest run of consecutive periods found anywhere in the given dates —
 * unlike calcPeriodStreak, doesn't need to end on the current period. Used
 * for lifetime "best streak" records.
 */
export function calcBestPeriodStreak(frequency: Frequency, completedDates: Set<string>): number {
  if (completedDates.size === 0) return 0
  const periods = [...new Set([...completedDates].map((d) => periodKeyOf(frequency, d)))].sort()

  if (frequency === 'monthly') {
    let best = 1
    let run = 1
    for (let i = 1; i < periods.length; i++) {
      const [py, pm] = periods[i - 1].split('-').map(Number)
      const [cy, cm] = periods[i].split('-').map(Number)
      const monthDiff = (cy - py) * 12 + (cm - pm)
      run = monthDiff === 1 ? run + 1 : 1
      best = Math.max(best, run)
    }
    return best
  }

  // daily / weekly / weekend: period keys are real dates (the day itself,
  // or that week's Monday) — consecutive periods are exactly this many
  // days apart.
  const step = frequency === 'daily' ? 1 : 7
  let best = 1
  let run = 1
  for (let i = 1; i < periods.length; i++) {
    const prev = new Date(periods[i - 1])
    const curr = new Date(periods[i])
    const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    run = dayDiff === step ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}
