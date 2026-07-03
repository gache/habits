import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import { getDaysInMonth, pad, todayStr } from '@/lib/date-utils'

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
      label: `WEEK ${weekNum}`,
      days: Array.from({ length: end - day + 1 }, (_, i) => day + i),
    })
    day = end + 1
    weekNum++
  }
  return weeks
}

export default function WeeklyProgress({ year, month, completions, habits }: WeeklyProgressProps) {
  const completedByHabit = new Set(completions.map((c) => `${c.habit_id}|${c.date}`))
  const completedDates = new Set(completions.map((c) => c.date))
  const monthStr = `${year}-${pad(month)}`
  const today = todayStr()
  const weeks = getWeeks(year, month)

  return (
    <div className="mt-6 border-t border-cream-300 dark:border-cream-600 pt-4">
      <h3 className="font-handwritten text-cream-600 dark:text-cream-400 text-base mb-3 tracking-wide">WEEKLY PROGRESS</h3>
      <div className="flex flex-col gap-2">
        {weeks.map(({ label, days }) => {
          let filled = 0
          let possible = 0
          for (const d of days) {
            const dateStr = `${monthStr}-${pad(d)}`
            if (dateStr > today) continue
            for (const h of habits) {
              const createdDate = h.created_at?.slice(0, 10)
              if (createdDate && createdDate > dateStr) continue
              possible++
              if (completedByHabit.has(`${h.id}|${dateStr}`)) filled++
            }
          }
          const pct = possible > 0 ? Math.round((filled / possible) * 100) : 0

          return (
            <div key={label} className="flex items-center gap-3">
              <span className="font-sans text-xs text-cream-600 dark:text-cream-400 w-28 shrink-0">
                {label} ({days[0]}–{days[days.length - 1]})
              </span>
              <div className="flex gap-1.5">
                {days.map((day) => {
                  const dateStr = `${monthStr}-${pad(day)}`
                  const isFilled = completedDates.has(dateStr)
                  return (
                    <div
                      key={day}
                      className="w-5 h-5 rounded-full border border-cream-300 dark:border-cream-600 transition-colors"
                      style={{ backgroundColor: isFilled ? '#a08860' : 'transparent' }}
                      title={dateStr}
                    />
                  )
                })}
              </div>
              <span className={[
                'font-sans font-bold text-xs ml-1',
                pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-cream-400',
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
