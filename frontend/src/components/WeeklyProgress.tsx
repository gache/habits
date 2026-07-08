import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import { getDaysInMonth, pad, todayStr } from '@/lib/date-utils'

const DAY_VALID_THRESHOLD_PCT = 80

interface WeeklyProgressProps {
  year: number
  month: number // 1-based
  completions: Completion[]
  habits: Habit[]
}

function getWeeks(year: number, month: number) {
  const total = getDaysInMonth(year, month)
  const weeks: { label: string; days: number[] }[] = []
  let day = 1
  let weekNum = 1
  while (day <= total) {
    const end = Math.min(day + 6, total)
    weeks.push({
      label: `SEMANA ${weekNum}`,
      days: Array.from({ length: end - day + 1 }, (_, i) => day + i),
    })
    day = end + 1
    weekNum++
  }
  return weeks
}

export default function WeeklyProgress({ year, month, completions, habits }: WeeklyProgressProps) {
  const completedByHabit = new Set(completions.map((c) => `${c.habit_id}|${c.date}`))
  const monthStr = `${year}-${pad(month)}`
  const today = todayStr()
  const weeks = getWeeks(year, month)
  // Only daily habits decompose into "one possible slot per day" — a weekly
  // habit done once a week isn't meant to be checked every day, so it can't
  // be scored on this per-day grid without misrepresenting it.
  const dailyHabits = habits.filter((h) => h.frequency === 'daily')

  const dayStats = (dateStr: string) => {
    let filled = 0
    // Every habit counts as possible on any past day — backfilling a day
    // before a habit's creation date is allowed, so creation date doesn't
    // exclude it here either.
    const possible = dailyHabits.length
    for (const h of dailyHabits) {
      if (completedByHabit.has(`${h.id}|${dateStr}`)) filled++
    }
    return { filled, possible }
  }

  return (
    <div className="mt-6 border-t border-cream-300 dark:border-cream-600 pt-4">
      <h3 className="font-handwritten text-cream-600 dark:text-cream-400 text-lg mb-3 tracking-wide">PROGRESO SEMANAL</h3>
      <div className="flex flex-col gap-2">
        {weeks.map(({ label, days }) => {
          let filled = 0
          let possible = 0
          for (const d of days) {
            const dateStr = `${monthStr}-${pad(d)}`
            if (dateStr > today) continue
            const stats = dayStats(dateStr)
            filled += stats.filled
            possible += stats.possible
          }
          const pct = possible > 0 ? Math.round((filled / possible) * 100) : 0

          return (
            <div key={label} className="flex items-center gap-3">
              <span className="font-sans text-sm text-cream-600 dark:text-cream-400 w-32 shrink-0">
                {label} ({days[0]}–{days[days.length - 1]})
              </span>
              <div className="flex gap-1">
                {days.map((day) => {
                  const dateStr = `${monthStr}-${pad(day)}`
                  const { filled: dayFilled, possible: dayPossible } = dayStats(dateStr)
                  const dayPct = dayPossible > 0 ? (dayFilled / dayPossible) * 100 : 0
                  const isFilled = dayPossible > 0 && dayPct >= DAY_VALID_THRESHOLD_PCT
                  return (
                    <div
                      key={day}
                      className="w-4 h-4 rounded-full border border-cream-300 dark:border-cream-600 transition-colors"
                      style={{ backgroundColor: isFilled ? '#457040' : 'transparent' }}
                      title={dateStr}
                    />
                  )
                })}
              </div>
              <span className={[
                'font-sans font-bold text-sm ml-1',
                pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-cream-600 dark:text-cream-400',
              ].join(' ')}>
                {String(pct).padStart(2, '0')}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
