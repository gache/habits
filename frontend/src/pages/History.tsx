import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, CaretRight, CalendarBlank, Target, CheckCircle, TrendUp, Star, NotePencil } from '@phosphor-icons/react'
import { useHabits, type Habit } from '@/hooks/useHabits'
import { useCompletions, useCompletionsForMonths } from '@/hooks/useCompletions'
import { useMonthlyLog } from '@/hooks/useMonthlyLog'
import { getDaysInMonth, pad, todayStr, habitDaysElapsed, habitPeriodsElapsed, countCompletedPeriods, dayChunks, APP_START_MONTH } from '@/lib/date-utils'
import { getProgressColor, getProgressBg } from '@/lib/progress-color'
import BestStreaks from '@/components/BestStreaks'
import { visibleHabitsForMonth } from '@/lib/report-utils'

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function getLast12Months(): { year: number; month: number; label: string }[] {
  const result = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    if (monthStr < APP_START_MONTH) break
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
  const visibleHabits = visibleHabitsForMonth(habits, monthStr)
  const { data: completions = [] } = useCompletions(monthStr)
  const { data: log } = useMonthlyLog(monthStr)
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? parseInt(today.slice(8), 10) : getDaysInMonth(year, month)
  let totalPossible = 0
  let totalCompleted = 0
  for (const h of visibleHabits) {
    const dates = new Set(completions.filter((c) => c.habit_id === h.id).map((c) => c.date))
    totalPossible += habitPeriodsElapsed(h.frequency, habitDaysElapsed(h.created_at, monthStr, daysElapsed, dates.size > 0))
    totalCompleted += countCompletedPeriods(h.frequency, dates, today)
  }
  const pct = totalPossible > 0 ? Math.min(100, Math.round((totalCompleted / totalPossible) * 100)) : 0

  const color = getProgressColor(pct)
  const bgColor = getProgressBg(pct)

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
        <span className="font-sans font-bold text-base text-cream-800 dark:text-cream-100">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <span className="font-sans font-bold text-xl" style={{ color }}>{pct}%</span>
      </div>

      {/* Mini bar per habit */}
      <div className="flex flex-col gap-1">
        {visibleHabits.map((h) => {
          const dates = new Set(completions.filter((c) => c.habit_id === h.id).map((c) => c.date))
          const done = countCompletedPeriods(h.frequency, dates, today)
          const effectivePeriods = habitPeriodsElapsed(
            h.frequency,
            habitDaysElapsed(h.created_at, monthStr, daysElapsed, dates.size > 0),
          )
          const hp = effectivePeriods > 0 ? Math.min(100, Math.round((done / effectivePeriods) * 100)) : 0
          return (
            <div key={h.id} className="flex items-center gap-1.5">
              <span className="text-sm w-4 text-center">{h.icon}</span>
              <div className="flex-1 h-1.5 rounded-full bg-cream-200 dark:bg-cream-600 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${hp}%`, backgroundColor: h.color }} />
              </div>
              <span className="text-sm text-cream-500 dark:text-cream-400 w-8 text-right">{hp}%</span>
            </div>
          )
        })}
      </div>

      {log?.goal && (
        <p className="mt-2 flex items-center gap-1 text-sm text-cream-500 dark:text-cream-400 truncate font-handwritten">
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
  const visibleHabits = visibleHabitsForMonth(habits, monthStr)
  const { data: completions = [], isLoading } = useCompletions(monthStr)
  const { data: log } = useMonthlyLog(monthStr)
  const daysInMonth = getDaysInMonth(year, month)
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth

  // Same narrow-screen treatment as the Tracker grid: show one ISO week at
  // a time so the heatmap and % column fit without horizontal scroll.
  const chunks = useMemo(() => dayChunks(days), [days])
  const [mobileWeekIndex, setMobileWeekIndex] = useState(0)
  const [prevMonthStr, setPrevMonthStr] = useState(monthStr)
  if (monthStr !== prevMonthStr) {
    setPrevMonthStr(monthStr)
    const todayDay = new Date().getDate()
    const idx = isCurrentMonth ? chunks.findIndex((chunk) => chunk.includes(todayDay)) : -1
    setMobileWeekIndex(idx === -1 ? 0 : idx)
  }
  const activeChunk = chunks[mobileWeekIndex] ?? days
  const mobileVisibleDays = useMemo(() => new Set(activeChunk), [activeChunk])

  if (isLoading) {
    return <p className="text-center py-10 text-cream-700 dark:text-cream-400 font-handwritten">Cargando...</p>
  }

  return (
    <div>
      <h2 className="font-sans font-extrabold text-2xl text-cream-800 dark:text-cream-100 tracking-widest mb-4">
        {MONTH_NAMES[month - 1].toUpperCase()} {year}
      </h2>

      {/* Mini heatmap per habit */}
      <div className="relative mb-5">
      <div className="rounded-lg border border-cream-300 dark:border-cream-600">
        {chunks.length > 1 && (
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-cream-300 dark:border-cream-600 sm:hidden">
            <button
              onClick={() => setMobileWeekIndex((i) => Math.max(0, i - 1))}
              disabled={mobileWeekIndex === 0}
              aria-label="Semana anterior"
              className="w-7 h-7 flex items-center justify-center rounded-full text-cream-600 dark:text-cream-300 disabled:opacity-30 hover:bg-cream-200 dark:hover:bg-cream-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <span className="text-sm font-bold text-cream-700 dark:text-cream-200 font-sans">
              Días {activeChunk[0]}–{activeChunk[activeChunk.length - 1]}
            </span>
            <button
              onClick={() => setMobileWeekIndex((i) => Math.min(chunks.length - 1, i + 1))}
              disabled={mobileWeekIndex === chunks.length - 1}
              aria-label="Semana siguiente"
              className="w-7 h-7 flex items-center justify-center rounded-full text-cream-600 dark:text-cream-300 disabled:opacity-30 hover:bg-cream-200 dark:hover:bg-cream-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        )}
        <div className="overflow-x-auto grid-scroll">
        <table className="text-sm border-collapse w-full">
          <thead>
            <tr className="bg-cream-100 dark:bg-cream-700 border-b border-cream-300 dark:border-cream-600">
              <th className="py-1.5 px-2 text-left font-bold text-cream-700 dark:text-cream-200 sticky left-0 bg-cream-100 dark:bg-cream-700 z-10 min-w-[150px] max-w-[150px] sm:min-w-[210px] sm:max-w-[210px]">HÁBITO</th>
              {days.map((d) => (
                <th key={d} className={['w-5 text-center font-bold text-cream-600 dark:text-cream-200 py-1.5', !mobileVisibleDays.has(d) ? 'hidden sm:table-cell' : ''].join(' ')}>{d}</th>
              ))}
              <th className="px-2 text-center font-bold text-cream-700 dark:text-cream-200">%</th>
            </tr>
          </thead>
          <tbody>
            {visibleHabits.map((habit) => {
              const done = new Set(completions.filter((c) => c.habit_id === habit.id).map((c) => c.date))
              // Collapses same-week weekly checks into one fulfilled period.
              const completedUpToToday = countCompletedPeriods(habit.frequency, done, today)
              const effectivePeriods = habitPeriodsElapsed(
                habit.frequency,
                habitDaysElapsed(habit.created_at, monthStr, daysElapsed, done.size > 0),
              )
              const pct = effectivePeriods > 0 ? Math.min(100, Math.round((completedUpToToday / effectivePeriods) * 100)) : 0
              return (
                <tr key={habit.id} className="border-b border-cream-200 dark:border-cream-600">
                  <td className="py-1 px-2 sticky left-0 bg-cream-50 dark:bg-cream-800 z-10 min-w-[150px] max-w-[150px] sm:min-w-[210px] sm:max-w-[210px]">
                    <span
                      title={habit.name}
                      className="font-sans font-bold text-sm text-cream-800 dark:text-cream-100 leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
                    >
                      {habit.icon} {habit.name}
                    </span>
                  </td>
                  {days.map((day) => {
                    const dateStr = `${monthStr}-${pad(day)}`
                    const completed = done.has(dateStr)
                    const isFuture = dateStr > today
                    return (
                      <td key={day} className={['p-0 text-center', !mobileVisibleDays.has(day) ? 'hidden sm:table-cell' : ''].join(' ')}>
                        <div
                          className="w-4 h-4 mx-auto rounded-sm border"
                          style={{
                            backgroundColor: completed ? habit.color : 'transparent',
                            borderColor: isFuture ? 'transparent' : completed ? habit.color : '#a08860',
                            opacity: isFuture ? 0.2 : 1,
                          }}
                        />
                      </td>
                    )
                  })}
                  <td className="px-2 text-center">
                    <span className="font-sans font-bold" style={{ color: getProgressColor(pct) }}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-cream-50 dark:from-cream-800 to-transparent rounded-r-lg sm:block hidden"
        aria-hidden="true"
      />
      </div>

      {/* Monthly reflection */}
      {(log?.goal || log?.reflection_well || log?.reflection_improve || log?.reflection_proud || log?.notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {log.goal && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-sm font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <Target size={12} weight="bold" aria-hidden="true" /> Meta
              </p>
              <p className="text-base text-cream-800 dark:text-cream-100 font-handwritten">{log.goal}</p>
            </div>
          )}
          {log.reflection_well && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-sm font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <CheckCircle size={12} weight="bold" aria-hidden="true" /> Qué salió bien
              </p>
              <p className="text-base text-cream-800 dark:text-cream-100 font-handwritten">{log.reflection_well}</p>
            </div>
          )}
          {log.reflection_improve && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-sm font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <TrendUp size={12} weight="bold" aria-hidden="true" /> Por mejorar
              </p>
              <p className="text-base text-cream-800 dark:text-cream-100 font-handwritten">{log.reflection_improve}</p>
            </div>
          )}
          {log.reflection_proud && (
            <div className="bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-sm font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <Star size={12} weight="bold" aria-hidden="true" /> Orgullo de
              </p>
              <p className="text-base text-cream-800 dark:text-cream-100 font-handwritten">{log.reflection_proud}</p>
            </div>
          )}
          {log.notes && (
            <div className="sm:col-span-2 bg-cream-100 dark:bg-cream-700/50 rounded-lg p-3 border border-cream-200 dark:border-cream-600">
              <p className="flex items-center gap-1 text-sm font-bold text-cream-600 dark:text-cream-300 uppercase tracking-wide mb-1">
                <NotePencil size={12} weight="bold" aria-hidden="true" /> Notas
              </p>
              <p className="text-base text-cream-800 dark:text-cream-100 font-handwritten whitespace-pre-wrap">{log.notes}</p>
            </div>
          )}
        </div>
      )}

      {!log?.goal && !log?.reflection_well && !log?.reflection_improve && !log?.reflection_proud && !log?.notes && (
        <p className="text-cream-700 dark:text-cream-400 font-handwritten text-base text-center py-4">
          No hay reflexión escrita para este mes.
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
            title="Volver al Tracker"
            aria-label="Volver al Tracker"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <div>
            <h1 className="font-sans font-extrabold text-3xl tracking-widest text-cream-800 dark:text-cream-100 flex items-center gap-2">
              <CalendarBlank size={22} weight="fill" aria-hidden="true" />
              HISTORIAL
            </h1>
            <p className="font-handwritten text-cream-700 dark:text-cream-400 text-lg">Tus últimos 12 meses de un vistazo.</p>
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
