import { WarningCircle } from '@phosphor-icons/react'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import HabitRow from './HabitRow'
import { getDaysInMonth, pad, todayStr } from '@/lib/date-utils'

interface HabitGridProps {
  habits: Habit[]
  year: number
  month: number // 1-based
  completions: Completion[]
  isError?: boolean
  onToggle: (habitId: string, date: string, isCompleted: boolean) => void
}

export default function HabitGrid({ habits, year, month, completions, isError, onToggle }: HabitGridProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthStr = `${year}-${pad(month)}`
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth

  if (isError) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-red-500 font-sans text-sm">
        <WarningCircle size={18} weight="fill" aria-hidden="true" />
        No se pudieron cargar los hábitos. Revisa tu conexión e intenta de nuevo.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-cream-300 dark:border-cream-600">
      <table className="text-xs w-full" style={{ borderCollapse: 'separate', borderSpacing: '1px 2px' }}>
        <thead>
          <tr className="bg-cream-100 dark:bg-cream-700">
            <th className="py-2 px-2 text-left font-bold text-cream-700 dark:text-cream-200 sticky left-0 bg-cream-100 dark:bg-cream-700 z-10 min-w-[210px] max-w-[210px] rounded-sm">
              HÁBITO
            </th>
            {days.map((d) => {
              const dateStr = `${monthStr}-${pad(d)}`
              const isToday = dateStr === today
              return (
                <th
                  key={d}
                  className={[
                    'text-center font-bold py-2 rounded-sm text-base tabular-nums w-7 min-w-[1.75rem]',
                    isToday ? 'text-cream-800 dark:text-cream-100 underline underline-offset-2' : 'text-cream-600 dark:text-cream-300',
                  ].join(' ')}
                >
                  {d}
                </th>
              )
            })}
            <th className="px-2 text-center font-bold text-cream-700 dark:text-cream-200 w-16 rounded-sm">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              days={days}
              monthStr={monthStr}
              today={today}
              totalDays={daysElapsed}
              completions={completions}
              showStreak={isCurrentMonth}
              onToggle={onToggle}
            />
          ))}
          {habits.length === 0 && (
            <tr>
              <td colSpan={days.length + 2} className="text-center py-8 text-cream-400 dark:text-cream-500 font-handwritten text-base">
                Aún no hay hábitos — ¡agrega uno con el botón +!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
