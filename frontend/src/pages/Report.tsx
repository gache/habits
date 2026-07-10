import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, ChartLineUp } from '@phosphor-icons/react'
import { useHabits } from '@/hooks/useHabits'
import { useCompletionsForMonths } from '@/hooks/useCompletions'
import MonthNav from '@/components/MonthNav'
import TrendChart from '@/components/TrendChart'
import HabitReportCard from '@/components/HabitReportCard'
import { pad, getDaysInMonth, todayStr, recentMonthStrs, APP_START_MONTH } from '@/lib/date-utils'
import { monthlyGlobalPct, visibleHabitsForMonth } from '@/lib/report-utils'

export default function Report() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const monthStr = `${year}-${pad(month)}`

  const { data: habits = [], isLoading } = useHabits(true)

  // Trend window: the 6 months ending at the selected month — offset from
  // "today" by however many months back the user has navigated, so
  // browsing to a past month shifts the trend window with it.
  const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  const trendMonths = useMemo(() => {
    const all = recentMonthStrs(monthsAgo + 6)
    return all.slice(monthsAgo, monthsAgo + 6).reverse() // oldest to newest
  }, [monthsAgo])
  const { data: trendCompletions = [] } = useCompletionsForMonths(trendMonths)

  // Streaks are about "right now," not the browsed month — always a
  // 12-month window anchored to today, same pattern Tracker.tsx uses for
  // HabitGrid, so streak numbers read the same on both pages.
  const streakMonths = useMemo(() => recentMonthStrs(12), [])
  const { data: streakCompletions = [] } = useCompletionsForMonths(streakMonths)

  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : getDaysInMonth(year, month)

  const trendPoints = trendMonths.map((m) => ({ monthStr: m, pct: monthlyGlobalPct(habits, trendCompletions, m) ?? 0 }))

  const prevMonth = () => {
    if (monthStr <= APP_START_MONTH) return
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-cream-950 transition-colors duration-200">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-700 dark:text-cream-200 flex items-center justify-center transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
            aria-label="Volver al Tracker"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <div>
            <h1 className="font-sans font-extrabold text-3xl tracking-widest text-cream-800 dark:text-cream-100 flex items-center gap-2">
              <ChartLineUp size={22} weight="fill" aria-hidden="true" />
              INFORME
            </h1>
            <p className="font-handwritten text-cream-700 dark:text-cream-400 text-lg">
              Cómo evolucionó cada hábito este mes.
            </p>
          </div>
        </div>

        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl px-4 py-3 mb-6 shadow-xs">
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} disablePrev={monthStr <= APP_START_MONTH} />
        </div>

        <TrendChart points={trendPoints} />

        {isLoading ? (
          <div className="animate-pulse space-y-3" role="status" aria-label="Cargando informe">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-cream-200 dark:bg-cream-700" />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <p className="text-center py-8 text-cream-700 dark:text-cream-400 font-handwritten text-lg">
            Aún no hay hábitos — ¡agrega uno con el botón +!
          </p>
        ) : (
          visibleHabitsForMonth(habits, monthStr)
            .filter(
              (habit) =>
                !habit.created_at ||
                habit.created_at.slice(0, 7) <= monthStr ||
                trendCompletions.some((c) => c.habit_id === habit.id && c.date.startsWith(monthStr)),
            )
            .map((habit) => (
            <HabitReportCard
              key={habit.id}
              habit={habit}
              monthStr={monthStr}
              monthCompletions={trendCompletions.filter(
                (c) => c.habit_id === habit.id && c.date.startsWith(monthStr),
              )}
              streakCompletions={streakCompletions.filter((c) => c.habit_id === habit.id)}
              daysElapsed={daysElapsed}
            />
          ))
        )}
      </div>
    </div>
  )
}
