import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plant, Sun, Moon, CalendarBlank, Plus, SignOut } from '@phosphor-icons/react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useHabits } from '@/hooks/useHabits'
import { useCompletions, useToggleCompletion } from '@/hooks/useCompletions'
import { useMonthlyLog, useUpdateMonthlyLog } from '@/hooks/useMonthlyLog'
import MonthNav from '@/components/MonthNav'
import HabitGrid from '@/components/HabitGrid'
import WeeklyProgress from '@/components/WeeklyProgress'
import MonthlyLog from '@/components/MonthlyLog'
import AddHabitModal from '@/components/AddHabitModal'
import BestStreaks from '@/components/BestStreaks'
import { pad, getDaysInMonth, todayStr, habitDaysElapsed } from '@/lib/date-utils'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

export default function Tracker() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const toggleDark = (on: boolean) => {
    setDarkMode(on)
    document.documentElement.classList.toggle('dark', on)
  }

  const monthStr = `${year}-${pad(month)}`
  const { data: habits = [], isLoading: habitsLoading, isError: habitsError } = useHabits(true)
  const { data: completions = [] } = useCompletions(monthStr)
  const { data: log } = useMonthlyLog(monthStr)
  const updateLog = useUpdateMonthlyLog(monthStr)
  const { toggle } = useToggleCompletion(monthStr)

  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : getDaysInMonth(year, month)
  const totalPossible = habits.reduce(
    (sum, h) => sum + habitDaysElapsed(h.created_at, monthStr, daysElapsed), 0,
  )
  const completedUpToToday = completions.filter((c) => {
    const h = habits.find((h) => h.id === c.habit_id)
    if (!h) return false
    return habitDaysElapsed(h.created_at, monthStr, daysElapsed) > 0 && c.date <= today
  }).length
  const globalPct = totalPossible > 0
    ? Math.min(100, Math.round((completedUpToToday / totalPossible) * 100))
    : null
  const pctColor = globalPct === null ? '#a88c58' : globalPct >= 80 ? '#457040' : globalPct >= 50 ? '#c2603a' : '#ef4444'

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-cream-950 transition-colors duration-200">
      <div className="max-w-screen-xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <header className="mb-6 relative">
          {/* Controls */}
          <div className="absolute right-0 top-0 flex items-center gap-1.5">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1.5 h-11 text-xs font-600 text-cream-600 dark:text-cream-300 border border-cream-200 dark:border-cream-700 rounded-full px-4 hover:bg-cream-200 dark:hover:bg-cream-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <CalendarBlank size={13} weight="bold" aria-hidden="true" />
              Historial
            </button>
            <button
              onClick={() => toggleDark(!darkMode)}
              className="w-11 h-11 rounded-full border border-cream-200 dark:border-cream-700 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-500 dark:text-cream-300 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun size={15} weight="fill" /> : <Moon size={15} weight="fill" />}
            </button>
            {!DEMO && (
              <button
                onClick={() => signOut(auth)}
                className="w-11 h-11 rounded-full border border-cream-200 dark:border-cream-700 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-600 dark:text-cream-400 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
                <h1 className="font-serif font-700 text-2xl sm:text-3xl text-cream-800 dark:text-cream-100">
                  Seguimiento de Hábitos
                </h1>
                <p className="font-handwritten text-cream-700 dark:text-cream-400 text-base mt-0.5">
                  Pequeños hábitos, grandes cambios. ♥
                </p>
              </div>
            </div>

            {/* Global % badge */}
            {globalPct !== null && (
              <div className="mt-3 inline-flex items-center gap-2 bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-full px-4 py-1.5 shadow-xs">
                <span className="text-xs text-cream-500 dark:text-cream-400 font-sans">Este mes</span>
                <span className="font-sans font-800 text-sm tabular-nums" style={{ color: pctColor }}>
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
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
          <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
            <label className="text-xs font-600 font-sans uppercase tracking-widest text-cream-700 dark:text-cream-400 shrink-0">Meta</label>
            <input
              key={`goal-${monthStr}`}
              defaultValue={log?.goal ?? ''}
              onChange={(e) => updateLog.mutate({ goal: e.target.value })}
              placeholder="Define una meta mensual..."
              aria-label="Meta de este mes"
              className="flex-1 border-b border-cream-200 dark:border-cream-700 bg-transparent text-sm text-cream-800 dark:text-cream-100 placeholder-cream-300 dark:placeholder-cream-600 focus:outline-none focus:border-amber-400 transition-colors pb-0.5 font-sans"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-full bg-terracotta-600 text-cream-50 hover:bg-terracotta-700 shadow-sm transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 shrink-0"
            aria-label="Agregar hábito"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>

        {/* ── Streaks ── */}
        <BestStreaks habits={habits} completions={completions} title="Mejores rachas este mes" />

        {/* ── Grid ── */}
        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl p-3 shadow-soft">
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
              habits={habits}
              year={year}
              month={month}
              completions={completions}
              isError={habitsError}
              onToggle={toggle}
            />
          )}
          <WeeklyProgress year={year} month={month} completions={completions} habits={habits} />
          <MonthlyLog month={monthStr} />
        </div>

        {/* ── Footer ── */}
        <footer className="mt-6 text-center">
          <p className="font-handwritten text-cream-700 dark:text-cream-400 text-sm tracking-wide">
            Conviértelo en hábito. Sé constante. Te estás convirtiendo en tu mejor versión. ❤️
          </p>
        </footer>

        {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} />}
      </div>
    </div>
  )
}
