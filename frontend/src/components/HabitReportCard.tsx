import { CalendarBlank } from '@phosphor-icons/react'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import {
  calcPeriodStreak,
  calcBestPeriodStreak,
  habitDaysElapsed,
  habitPeriodsElapsed,
  countCompletedPeriods,
  todayStr,
} from '@/lib/date-utils'
import { periodUnitLabel } from '@/lib/streak-levels'
import { FREQUENCY_LABELS, FREQUENCY_BADGE_STYLES } from '@/lib/habit-presets'
import { getProgressColor } from '@/lib/progress-color'
import { missedPeriods, weekdayPattern } from '@/lib/report-utils'

interface HabitReportCardProps {
  habit: Habit
  monthStr: string // "YYYY-MM"
  monthCompletions: Completion[] // this habit's completions, already scoped to monthStr
  streakCompletions: Completion[] // this habit's completions, wider window (for streak calc)
  daysElapsed: number
}

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export default function HabitReportCard({
  habit,
  monthStr,
  monthCompletions,
  streakCompletions,
  daysElapsed,
}: HabitReportCardProps) {
  const today = todayStr()
  const monthDates = new Set(monthCompletions.map((c) => c.date))
  const streakDates = new Set(streakCompletions.map((c) => c.date))

  const completed = countCompletedPeriods(habit.frequency, monthDates, today)
  const possible = habitPeriodsElapsed(
    habit.frequency,
    habitDaysElapsed(habit.created_at, monthStr, daysElapsed, monthDates.size > 0),
  )
  const pct = possible > 0 ? Math.min(100, Math.round((completed / possible) * 100)) : 0
  const pctColor = getProgressColor(pct)

  const streak = calcPeriodStreak(habit.frequency, streakDates)
  const bestStreak = calcBestPeriodStreak(habit.frequency, streakDates)

  const missed = missedPeriods(habit, monthCompletions, monthStr)
  const pattern = habit.frequency === 'daily' ? weekdayPattern(monthCompletions, monthStr) : null

  return (
    <div className="bg-cream-50 dark:bg-cream-800 border border-cream-300 dark:border-cream-600 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans font-bold text-base text-cream-800 dark:text-cream-100 truncate">
            {habit.icon} {habit.name}
          </span>
          <span
            className={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-sm font-bold uppercase tracking-wide shrink-0',
              FREQUENCY_BADGE_STYLES[habit.frequency],
            ].join(' ')}
          >
            <CalendarBlank size={11} weight="bold" aria-hidden="true" /> {FREQUENCY_LABELS[habit.frequency]}
          </span>
        </div>
        <span className="font-sans font-800 text-lg tabular-nums shrink-0" style={{ color: pctColor }}>
          {pct}%
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-cream-200 dark:bg-cream-700 overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: pctColor }}
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-cream-700 dark:text-cream-300 mb-2">
        <span>
          🔥 Racha: {streak} {periodUnitLabel(habit.frequency, streak)}
        </span>
        <span>
          🏆 Mejor: {bestStreak} {periodUnitLabel(habit.frequency, bestStreak)}
        </span>
      </div>

      {missed.length > 0 && (
        <p className="text-sm text-cream-600 dark:text-cream-400">
          {habit.frequency === 'daily' ? 'Días fallados: ' : 'Semanas falladas: '}
          {missed.join(', ')}
        </p>
      )}

      {pattern && (
        <div className="flex items-end gap-1 mt-3">
          {pattern.map((p) => (
            <div key={p.weekday} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-cream-200 dark:bg-cream-700 rounded-sm overflow-hidden flex flex-col justify-end"
                style={{ height: '32px' }}
              >
                <div
                  className="w-full rounded-sm"
                  style={{ height: `${p.rate * 100}%`, backgroundColor: habit.color }}
                />
              </div>
              <span className="text-xs text-cream-500 dark:text-cream-500">{WEEKDAY_LABELS[p.weekday]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
