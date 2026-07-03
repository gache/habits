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
  const pctColor = globalPct === null ? '#a88c58' : globalPct >= 80 ? '#16a34a' : globalPct >= 50 ? '#d97706' : '#ef4444'

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
        <header className="mb-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h1 className="font-serif font-700 text-2xl sm:text-3xl text-cream-800 dark:text-cream-100 flex items-center gap-2">
                <Plant className="text-sage-600 shrink-0" size={28} weight="fill" aria-hidden="true" />
                Habit Tracker
              </h1>
              <p className="font-handwritten text-cream-400 dark:text-cream-500 text-base mt-0.5">
                Small habits, big changes. ♥
              </p>
            </div>
            {/* Controls */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-1.5 text-xs font-600 text-cream-600 dark:text-cream-300 border border-cream-200 dark:border-cream-700 rounded-full px-3 py-1.5 hover:bg-cream-200 dark:hover:bg-cream-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <CalendarBlank size={13} weight="bold" aria-hidden="true" />
                History
              </button>
              <button
                onClick={() => toggleDark(!darkMode)}
                className="w-8 h-8 rounded-full border border-cream-200 dark:border-cream-700 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-500 dark:text-cream-300 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={15} weight="fill" /> : <Moon size={15} weight="fill" />}
              </button>
              {!DEMO && (
                <button
                  onClick={() => signOut(auth)}
                  className="w-8 h-8 rounded-full border border-cream-200 dark:border-cream-700 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-400 dark:text-cream-500 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <SignOut size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Global % badge */}
          {globalPct !== null && (
            <div className="mt-3 inline-flex items-center gap-2 bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-full px-4 py-1.5 shadow-xs">
              <span className="text-xs text-cream-500 dark:text-cream-400 font-sans">This month</span>
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
        </header>

        {/* ── Month bar ── */}
        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl px-4 py-3 mb-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
          <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
            <label className="text-[11px] font-600 font-sans uppercase tracking-widest text-cream-400 dark:text-cream-500 shrink-0">Goal</label>
            <input
              key={`goal-${monthStr}`}
              defaultValue={log?.goal ?? ''}
              onChange={(e) => updateLog.mutate({ goal: e.target.value })}
              placeholder="Set a monthly goal..."
              aria-label="Goal this month"
              className="flex-1 border-b border-cream-200 dark:border-cream-700 bg-transparent text-sm text-cream-800 dark:text-cream-100 placeholder-cream-300 dark:placeholder-cream-600 focus:outline-none focus:border-amber-400 transition-colors pb-0.5 font-sans"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-full bg-cream-800 dark:bg-cream-100 text-cream-50 dark:text-cream-800 hover:bg-cream-700 dark:hover:bg-cream-200 shadow-sm transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 shrink-0"
            aria-label="Add habit"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>

        {/* ── Streaks ── */}
        <BestStreaks habits={habits} completions={completions} title="Best streaks this month" />

        {/* ── Grid ── */}
        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl p-4 shadow-xs">
          {habitsLoading ? (
            <div className="py-12 text-center">
              <p className="font-handwritten text-cream-300 dark:text-cream-600 text-xl">Loading habits…</p>
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
          <p className="font-handwritten text-cream-300 dark:text-cream-600 text-sm tracking-wide">
            Make it a habit. Be consistent. You are becoming your best self. ❤️
          </p>
        </footer>

        {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} />}
      </div>
    </div>
  )
}
