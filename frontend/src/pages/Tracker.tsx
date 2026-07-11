import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plant, Sun, Moon, CalendarBlank, ChartLineUp, Plus, SignOut, Heart, ArrowCounterClockwise } from '@phosphor-icons/react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useHabits, useRestoreHabit } from '@/hooks/useHabits'
import { useCompletions, useCompletionsForMonths, useToggleCompletion } from '@/hooks/useCompletions'
import { useMonthlyLog, useUpdateMonthlyLog } from '@/hooks/useMonthlyLog'
import MonthNav from '@/components/MonthNav'
import HabitGrid from '@/components/HabitGrid'
import WeeklyProgress from '@/components/WeeklyProgress'
import MonthlyLog from '@/components/MonthlyLog'
import AddHabitModal from '@/components/AddHabitModal'
import BestStreaks from '@/components/BestStreaks'
import Toast from '@/components/Toast'
import { pad, recentMonthStrs, APP_START_MONTH } from '@/lib/date-utils'
import { getProgressColor } from '@/lib/progress-color'
import { monthlyGlobalPct, visibleHabitsForMonth } from '@/lib/report-utils'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

export default function Tracker() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const toggleDark = (on: boolean) => {
    setDarkMode(on)
    document.documentElement.classList.toggle('dark', on)
    localStorage.setItem('darkMode', String(on))
  }

  const monthStr = `${year}-${pad(month)}`
  const { data: habits = [], isLoading: habitsLoading, isError: habitsError } = useHabits(true)
  const visibleHabits = visibleHabitsForMonth(habits, monthStr)
  // Habits deleted from this specific month (via excluded_months) — once the
  // undo toast's 5s window closes there's otherwise no way back short of
  // calling the API by hand, so surface them here with a one-click restore.
  const excludedHabits = habits.filter((h) => h.excluded_months?.includes(monthStr))
  const restoreHabit = useRestoreHabit()
  const { data: completions = [] } = useCompletions(monthStr)
  // Widened window (not just the displayed month) so a per-habit streak
  // that crosses a month boundary — e.g. started the 28th, still going on
  // the 1st — doesn't look broken or reset to 0 just because June's
  // completions aren't in the July-scoped `completions` fetch above.
  const streakMonths = useMemo(() => recentMonthStrs(12), [])
  const { data: streakCompletions = [] } = useCompletionsForMonths(streakMonths)
  const { data: log } = useMonthlyLog(monthStr)
  const updateLog = useUpdateMonthlyLog(monthStr)
  const { toggle } = useToggleCompletion(monthStr)

  const globalPct = monthlyGlobalPct(habits, completions, monthStr)
  const pctColor = globalPct === null ? '#a88c58' : getProgressColor(globalPct)

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

        {/* ── Header ── */}
        <header className="mb-6 sm:relative">
          {/* Controls — stacked above the title on mobile so they never
              overlap it; pinned top-right from `sm` up like before. */}
          <div className="flex items-center justify-center gap-1.5 mb-3 sm:mb-0 sm:absolute sm:right-0 sm:top-0">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1.5 h-11 text-sm font-600 text-cream-600 dark:text-cream-300 border border-cream-200 dark:border-cream-700 rounded-full px-4 hover:bg-cream-200 dark:hover:bg-cream-800 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <CalendarBlank size={13} weight="bold" aria-hidden="true" />
              Historial
            </button>
            <button
              onClick={() => navigate('/informe')}
              className="flex items-center gap-1.5 h-11 text-sm font-600 text-cream-600 dark:text-cream-300 border border-cream-200 dark:border-cream-700 rounded-full px-4 hover:bg-cream-200 dark:hover:bg-cream-800 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ChartLineUp size={13} weight="bold" aria-hidden="true" />
              Informe
            </button>
            <button
              onClick={() => toggleDark(!darkMode)}
              className="w-11 h-11 rounded-full border border-cream-200 dark:border-cream-700 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-500 dark:text-cream-300 flex items-center justify-center transition-all active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun size={15} weight="fill" /> : <Moon size={15} weight="fill" />}
            </button>
            {!DEMO && (
              <button
                onClick={() => signOut(auth)}
                className="w-11 h-11 rounded-full border border-cream-200 dark:border-cream-700 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-600 dark:text-cream-400 flex items-center justify-center transition-all active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <SignOut size={14} />
              </button>
            )}
          </div>

          {/* Centered title block */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sage-100 dark:bg-sage-900/40 flex items-center justify-center shrink-0 shadow-xs">
                <Plant className="text-sage-600 dark:text-sage-400" size={24} weight="fill" aria-hidden="true" />
              </div>
              <div className="text-left">
                <h1 className="font-serif font-700 text-3xl sm:text-4xl text-cream-800 dark:text-cream-100">
                  Seguimiento de Hábitos
                </h1>
                <p className="font-handwritten text-cream-700 dark:text-cream-400 text-lg mt-0.5">
                  Pequeños hábitos, grandes cambios. ♥
                </p>
              </div>
            </div>

            {/* Global % badge */}
            {globalPct !== null && (
              <div className="mt-3 inline-flex items-center gap-2 bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-full px-4 py-1.5 shadow-xs">
                <span className="text-sm text-cream-700 dark:text-cream-400 font-sans">Este mes</span>
                <span className="font-sans font-800 text-base tabular-nums" style={{ color: pctColor }}>
                  {String(globalPct).padStart(2, '0')}%
                </span>
                <div className="w-24 h-1.5 rounded-full bg-cream-200 dark:bg-cream-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${globalPct}%`, backgroundColor: pctColor }}
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Month bar ── */}
        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl px-4 py-3 mb-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} disablePrev={monthStr <= APP_START_MONTH} />
          <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
            <label className="text-sm font-600 font-sans uppercase tracking-widest text-cream-700 dark:text-cream-400 shrink-0">Meta</label>
            <input
              key={`goal-${monthStr}`}
              defaultValue={log?.goal ?? ''}
              onChange={(e) => updateLog.mutate({ goal: e.target.value })}
              placeholder="Define una meta mensual..."
              aria-label="Meta de este mes"
              className="flex-1 border-b border-cream-200 dark:border-cream-700 bg-transparent text-base text-cream-800 dark:text-cream-100 placeholder-cream-300 dark:placeholder-cream-600 focus:outline-none focus:border-amber-400 transition-colors pb-0.5 font-sans"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-full bg-terracotta-600 text-cream-50 hover:bg-terracotta-700 shadow-sm transition-all active:scale-90 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 shrink-0"
            aria-label="Agregar hábito"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>

        {/* ── Excluded from this month ── */}
        {excludedHabits.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-cream-600 dark:text-cream-400">Eliminados este mes:</span>
            {excludedHabits.map((h) => (
              <button
                key={h.id}
                onClick={() => restoreHabit.mutate({ id: h.id, month: monthStr, dates: [] })}
                disabled={restoreHabit.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-800 px-2.5 py-1 text-cream-700 dark:text-cream-200 hover:bg-cream-100 dark:hover:bg-cream-700 transition-all active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400"
              >
                {h.icon} {h.name}
                <ArrowCounterClockwise size={12} weight="bold" aria-hidden="true" />
                Restaurar
              </button>
            ))}
          </div>
        )}

        {/* ── Streaks ── */}
        <BestStreaks habits={visibleHabits} completions={completions} title="Mejores rachas este mes" />

        {/* ── Grid ── */}
        {/* key={monthStr} forces a remount on month nav so content-fade-in
            replays — a subtle cue that the page actually changed. */}
        <div key={monthStr} className="content-fade-in bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl p-1.5 sm:p-3 shadow-soft">
          {habitsLoading ? (
            <div className="animate-pulse space-y-2" role="status" aria-label="Cargando hábitos">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className="h-8 w-8 rounded-full bg-cream-200 dark:bg-cream-700 shrink-0" />
                  <div className="h-4 flex-1 max-w-[180px] rounded bg-cream-200 dark:bg-cream-700" />
                  <div className="h-6 flex-1 rounded bg-cream-100 dark:bg-cream-800" />
                </div>
              ))}
            </div>
          ) : (
            <HabitGrid
              habits={visibleHabits}
              year={year}
              month={month}
              completions={completions}
              streakCompletions={streakCompletions}
              isError={habitsError}
              onToggle={toggle}
            />
          )}
          <WeeklyProgress year={year} month={month} completions={completions} habits={visibleHabits} />
          <MonthlyLog month={monthStr} />
        </div>

        {/* ── Footer ── */}
        <footer className="mt-8 pt-5 border-t border-cream-200 dark:border-cream-700 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-cream-500 dark:text-cream-500">
            <Plant size={15} weight="fill" aria-hidden="true" />
            <span className="font-sans text-sm font-800 uppercase tracking-widest">Hábitos</span>
          </div>
          <p className="font-handwritten text-cream-700 dark:text-cream-400 text-lg tracking-wide inline-flex items-center gap-1">
            Conviértelo en hábito. Sé constante. Te estás convirtiendo en tu mejor versión.
            <Heart size={16} weight="fill" aria-hidden="true" />
          </p>
          <p className="font-sans text-sm text-cream-600 dark:text-cream-500">
            © {new Date().getFullYear()} Hábitos. Todos los derechos reservados.
          </p>
        </footer>

        {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} onSaved={setSavedMessage} />}
        {savedMessage && (
          <Toast
            message={savedMessage}
            durationMs={3000}
            onTimeout={() => setSavedMessage(null)}
          />
        )}
      </div>
    </div>
  )
}
