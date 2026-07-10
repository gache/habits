import { Trophy } from '@phosphor-icons/react'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import { calcBestPeriodStreak } from '@/lib/date-utils'
import { getStreakLevel, periodUnitLabel } from '@/lib/streak-levels'

interface BestStreaksProps {
  habits: Habit[]
  completions: Completion[]
  title?: string
}

export default function BestStreaks({ habits, completions, title = 'MEJORES RACHAS (ÚLTIMOS 12 MESES)' }: BestStreaksProps) {
  const records = habits
    .map((habit) => {
      const dates = new Set(completions.filter((c) => c.habit_id === habit.id).map((c) => c.date))
      const best = calcBestPeriodStreak(habit.frequency, dates)
      return { habit, best, level: getStreakLevel(best, habit.frequency) }
    })
    // Only worth showing off once it's reached a real tier — the threshold
    // for that is frequency-specific (2 periods for weekly/weekend/monthly,
    // 3 days for daily), so it comes from the level table, not a flat number.
    .filter((r) => r.level !== null)
    .sort((a, b) => b.best - a.best)

  if (records.length === 0) return null

  return (
    <div className="mb-6 bg-cream-50 dark:bg-cream-800 border border-cream-300 dark:border-cream-600 rounded-xl p-4">
      <h2 className="flex items-center gap-1.5 font-sans font-extrabold text-base tracking-widest text-cream-800 dark:text-cream-100 mb-3">
        <Trophy size={16} weight="fill" aria-hidden="true" />
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {records.map(({ habit, best, level }) => {
          const Icon = level?.icon ?? Trophy
          return (
            <div
              key={habit.id}
              className="flex items-center gap-1.5 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-100 dark:bg-cream-700 px-3 py-1.5"
            >
              <Icon size={14} weight="fill" color={level?.color ?? '#a08860'} aria-hidden="true" />
              <span className="font-sans font-bold text-sm text-cream-800 dark:text-cream-100">
                {habit.icon} {habit.name}
              </span>
              <span className="font-sans text-sm text-cream-700 dark:text-cream-300">
                {best} {periodUnitLabel(habit.frequency, best)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
