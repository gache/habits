import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, CalendarBlank, Target, CheckCircle, TrendUp, Star, NotePencil } from '@phosphor-icons/react'
import { useHabits, type Habit } from '@/hooks/useHabits'
import { useCompletions, useCompletionsForMonths } from '@/hooks/useCompletions'
import { useMonthlyLog } from '@/hooks/useMonthlyLog'
import { getDaysInMonth, pad, todayStr, habitDaysElapsed } from '@/lib/date-utils'
import BestStreaks from '@/components/BestStreaks'

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function getLast12Months(): { year: number; month: number; label: string }[] {
  const result = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    })
  }
  return result
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface MonthCardProps {
  year: number
  month: number
  habits: Habit[]
  isSelected: boolean
  onClick: () => void
}

function MonthCard({ year, month, habits, isSelected, onClick }: MonthCardProps) {
  const monthStr = `${year}-${pad(month)}`
  const { data: completions = [] } = useCompletions(monthStr)
  const { data: log } = useMonthlyLog(monthStr)
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? parseInt(today.slice(8), 10) : getDaysInMonth(year, month)
  const totalPossible = habits.length * daysElapsed
  const totalCompleted = completions.filter((c) => c.date <= today).length
  const pct = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0

  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444'
  const bgColor = pct >= 80 ? 'bg-green-50 dark:bg-green-950/30' : pct >= 50 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/20'

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl border-2 p-4 transition-all',
        isSelected
          ? 'border-cream-800 dark:border-cream-200 shadow-md'
          : 'border-cream-300 dark:border-cream-600 hover:border-cream-500 dark:hover:border-cream-400',
        bgColor,
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans font-bold text-sm text-cream-800 dark:text-cream-100">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <span className="font-sans font-bold text-lg" style={{ color }}>{pct}%</span>
      </div>

      {/* Mini bar per habit */}
      <div className="flex flex-col gap-1">
        {habits.map((h) => {
          const done = completions.filter((c) => c.habit_id === h.id && c.date <= today).length
          const hp = daysElapsed > 0 ? Math.round((done / daysElapsed) * 100) : 0
          return (
            <div key={h.id} className="flex items-center gap-1.5">
              <span className="text-[11px] w-4 text-center">{h.icon}</span>
              <div className="flex-1 h-1.5 rounded-full bg-cream-200 dark:bg-cream-600 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${hp}%`, backgroundColor: h.color }} />
              </div>
              <span className="text-[10px] text-cream-500 dark:text-cream-400 w-7 text-right">{hp}%</span>
            </div>
          )
        })}
      </div>

      {log?.goal && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-cream-500 dark:text-cream-400 truncate font-handwritten">
          <Target size={12} weight="bold" aria-hidden="true" />
          {log.goal}
        </p>
      )}
    </button>
  )
}

// ─── detail panel ────────────────────────────────────────────────────────────

interface DetailPanelProps {
  year: number
  month: number
  habits: Habit[]
}

function DetailPanel({ year, month, habits }: DetailPanelProps) {
  const monthStr = `${year}-${pad(month)}`
  const { data: completions = [], isLoading } = useCompletions(monthStr)
  const { data: log } = useMonthlyLog(monthStr)
  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth

  if (isLoading) {
    return <p className="text-center py-10 text-cream-400 font-handwritten">Loading...</p>
  }

  return (
    <div>
      <h2 className="font-sans font-extrabold text-xl text-cream-800 dark:text-cream-100 tracking-widest mb-4">
        {MONTH_NAMES[month - 1].toUpperCase()} {year}
      </h2>

      {/* Mini heatmap per habit */}
      <div className="overflow-x-auto rounded-lg border border-cream-300 dark:border-cream-600 mb-5">
        <table className="text-[10px] border-collapse w-full">
          <thead>
            <tr className="bg-cream-100 dark:bg-cream-700 border-b border-cream-300 dark:border-cream-600">
              <th className="py-1.5 px-2 text-left font-bold text-cream-700 dark:text-cream-200 sticky left-0 bg-cream-100 dark:bg-cream-700 z-10 min-w-[120px]">HABIT</th>
              {days.map((d) => (
                <th key={d} className="w-5 text-center font-bold text-cream-500 dark:text-cream-400 py-1.5">{d}</th>
              ))}
              <th className="px-2 text-center font-bold text-cream-700 dark:text-cream-200">%</th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => {
              const done = new Set(completions.filter((c) => c.habit_id === habit.id).map((c) => c.date))
              // Only count completions up to today to avoid inflated % from future-dated seed data
              const completedUpToToday = [...done].filter((d) => d <= today).length
              const effectiveDays = habitDaysElapsed(habit.created_at, monthStr, daysElapsed)
              const pct = effectiveDays > 0 ? Math.min(100, Math.round((completedUpToToday / effectiveDays) * 100)) : 0
              return (
                <tr key={habit.id} className="border-b border-cream-200 dark:border-cream-600">
                  <td className="py-1 px-2 sticky left-0 bg-cream-50 dark:bg-cream-800 z-10">
                    <span className="font-sans font-bold text-[11px] text-cream-800 dark:text-cream-100">
                      {habit.icon} {habit.name}
                    </span>
                  </td>
                  {days.map((day) => {
                    const dateStr = `${monthStr}-${pad(day)}`
                    const completed = done.has(dateStr)
                    const isFuture = dateStr > today
                    return (
                      <td key={day} className="p-0 text-center">
                        <div
                          className="w-4 h-4 mx-auto rounded-sm border"
                          style={{
                            backgroundColor: completed ? habit.color : 'transparent',
                            borderColor: isFuture ? 'transparent' : completed ? habit.color : '#d4c4a8',
                            opacity: isFuture ? 0.2 : 1,
                          }}
                        />
                      </td>
                    )
                  })}
                  <td className="px-2 text-center">
                    <span className="font-sans font-bold" style={{ color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444' }}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Monthly reflection */}
      {(log?.goal || log?.reflection_well || log?.reflection_improve || log?.reflection_proud || log?.notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {log.goal && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-[11px] font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <Target size={12} weight="bold" aria-hidden="true" /> Goal
              </p>
              <p className="text-sm text-cream-800 dark:text-cream-100 font-handwritten">{log.goal}</p>
            </div>
          )}
          {log.reflection_well && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-[11px] font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <CheckCircle size={12} weight="bold" aria-hidden="true" /> What went well
              </p>
              <p className="text-sm text-cream-800 dark:text-cream-100 font-handwritten">{log.reflection_well}</p>
            </div>
          )}
          {log.reflection_improve && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-[11px] font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <TrendUp size={12} weight="bold" aria-hidden="true" /> To improve
              </p>
              <p className="text-sm text-cream-800 dark:text-cream-100 font-handwritten">{log.reflection_improve}</p>
            </div>
          )}
          {log.reflection_proud && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-[11px] font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <Star size={12} weight="bold" aria-hidden="true" /> Proud of
              </p>
              <p className="text-sm text-cream-800 dark:text-cream-100 font-handwritten">{log.reflection_proud}</p>
            </div>
          )}
          {log.notes && (
            <div className="sm:col-span-2 bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-[11px] font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <NotePencil size={12} weight="bold" aria-hidden="true" /> Notes
              </p>
              <p className="text-sm text-cream-800 dark:text-cream-100 font-handwritten whitespace-pre-wrap">{log.notes}</p>
            </div>
          )}
        </div>
      )}

      {!log?.goal && !log?.reflection_well && !log?.reflection_improve && !log?.reflection_proud && !log?.notes && (
        <p className="text-cream-400 dark:text-cream-500 font-handwritten text-sm text-center py-4">
          No reflection written for this month.
        </p>
      )}
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate()
  const months = getLast12Months()
  const [selected, setSelected] = useState(months[0])
  const { data: habits = [] } = useHabits(true)
  const { data: allCompletions } = useCompletionsForMonths(
    months.map((m) => `${m.year}-${pad(m.month)}`),
  )

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-cream-900 transition-colors">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-700 dark:text-cream-200 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
            title="Back to Tracker"
            aria-label="Back to Tracker"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <div>
            <h1 className="font-sans font-extrabold text-2xl tracking-widest text-cream-800 dark:text-cream-100 flex items-center gap-2">
              <CalendarBlank size={22} weight="fill" aria-hidden="true" />
              HISTORY
            </h1>
            <p className="font-handwritten text-cream-500 text-base">Your last 12 months at a glance.</p>
          </div>
        </div>

        <BestStreaks habits={habits} completions={allCompletions} />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: month selector grid */}
          <div className="lg:w-72 shrink-0">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {months.map((m) => (
                <MonthCard
                  key={`${m.year}-${m.month}`}
                  year={m.year}
                  month={m.month}
                  habits={habits}
                  isSelected={selected.year === m.year && selected.month === m.month}
                  onClick={() => setSelected(m)}
                />
              ))}
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 bg-cream-50 dark:bg-cream-800 border border-cream-300 dark:border-cream-600 rounded-xl p-5">
            <DetailPanel year={selected.year} month={selected.month} habits={habits} />
          </div>
        </div>
      </div>
    </div>
  )
}
