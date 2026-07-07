import { useEffect, useState } from 'react'
import { PencilSimple, Archive, Trash } from '@phosphor-icons/react'
import { type Habit, useDeleteHabit, useUpdateHabit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import DayCell from './DayCell'
import AddHabitModal from './AddHabitModal'
import ConfirmDialog from './ConfirmDialog'
import StreakCelebration from './StreakCelebration'
import Toast from './Toast'
import { pad, calcStreak, habitDaysElapsed, isCompletionCountable } from '@/lib/date-utils'
import { getStreakLevel, type StreakLevel } from '@/lib/streak-levels'

const celebratedKey = (habitId: string) => `habit-streak-celebrated:${habitId}`
const lastStreakKey = (habitId: string) => `habit-streak-last:${habitId}`

interface HabitRowProps {
  habit: Habit
  days: number[]
  monthStr: string
  today: string       // "YYYY-MM-DD"
  totalDays: number   // days elapsed (for progress bar)
  completions: Completion[]
  showStreak?: boolean
  onToggle: (habitId: string, date: string, isCompleted: boolean) => void
}

export default function HabitRow({ habit, days, monthStr, today, totalDays, completions, showStreak = true, onToggle }: HabitRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [celebrating, setCelebrating] = useState<{ level: StreakLevel; streak: number } | null>(null)
  const deleteHabit = useDeleteHabit()
  const updateHabit = useUpdateHabit()

  const completedDates = new Set(
    completions.filter((c) => c.habit_id === habit.id).map((c) => c.date),
  )

  const total = completedDates.size
  const streak = calcStreak(completedDates)
  const streakLevel = showStreak ? getStreakLevel(streak) : null

  useEffect(() => {
    if (!showStreak) return

    // If the streak dropped since we last saw it, it broke — forget which
    // tiers were celebrated so rebuilding past them celebrates again.
    const lastKey = lastStreakKey(habit.id)
    const lastStreak = Number(localStorage.getItem(lastKey) ?? 0)
    if (streak < lastStreak) {
      localStorage.removeItem(celebratedKey(habit.id))
    }
    localStorage.setItem(lastKey, String(streak))

    if (!streakLevel) return
    const key = celebratedKey(habit.id)
    const lastCelebrated = Number(localStorage.getItem(key) ?? 0)
    if (streakLevel.days > lastCelebrated) {
      localStorage.setItem(key, String(streakLevel.days))
      setCelebrating({ level: streakLevel, streak })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habit.id, streak, showStreak])

  const completedUpToToday = completions.filter(
    (c) => c.habit_id === habit.id && isCompletionCountable(habit.created_at, c.date, today),
  ).length
  const effectiveDays = habitDaysElapsed(habit.created_at, monthStr, totalDays)
  const progressPct = effectiveDays > 0 ? Math.min(100, Math.round((completedUpToToday / effectiveDays) * 100)) : 0

  const handleDelete = () => {
    setConfirmingDelete(false)
    setDeleting(true)
  }

  const handleArchive = () => {
    updateHabit.mutate({ id: habit.id, updates: { active: false } })
  }

  if (deleting) {
    return (
      <Toast
        message={`"${habit.name}" eliminado`}
        actionLabel="Deshacer"
        onAction={() => setDeleting(false)}
        onTimeout={() => deleteHabit.mutate(habit.id)}
      />
    )
  }

  return (
    <>
      <tr className="border-b border-cream-200 dark:border-cream-600 group hover:bg-cream-100/50 dark:hover:bg-cream-700/50 transition-colors">
        {/* Habit info cell */}
        <td className="py-1.5 pr-2 sticky left-0 bg-cream-50 dark:bg-cream-800 z-10 min-w-[172px] max-w-[172px]">
          <div className="flex items-start gap-1.5">
            {/* Color accent bar */}
            <div
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: habit.color }}
            />
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <span
                  title={habit.name}
                  className="font-sans font-bold text-xs text-cream-800 dark:text-cream-100 leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
                >
                  {habit.icon} {habit.name}
                </span>
                {streakLevel && (
                  <span
                    className="flex items-center gap-0.5 text-xs font-bold shrink-0 mt-0.5"
                    style={{ color: streakLevel.color }}
                    title={`Racha de ${streak} días — ${streakLevel.label}`}
                    aria-label={`Racha de ${streak} días, ${streakLevel.label}`}
                  >
                    <streakLevel.icon size={11} weight="fill" />
                    {streak}
                  </span>
                )}
              </div>
              {habit.description && (
                <div className="font-sans text-xs text-cream-500 dark:text-cream-400 truncate">{habit.description}</div>
              )}
            </div>
            {/* Edit / Archive / Delete buttons — visible on hover */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-cream-700 dark:hover:text-cream-200 hover:bg-cream-200 dark:hover:bg-cream-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
                title="Editar hábito"
                aria-label={`Editar ${habit.name}`}
              >
                <PencilSimple size={14} />
              </button>
              <button
                onClick={handleArchive}
                className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
                title="Archivar hábito (ocultar sin eliminar)"
                aria-label={`Archivar ${habit.name}`}
              >
                <Archive size={14} />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                title="Eliminar hábito permanentemente"
                aria-label={`Eliminar ${habit.name}`}
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        </td>

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = `${monthStr}-${pad(day)}`
          const completed = completedDates.has(dateStr)
          const isFutureUncompleted = dateStr > today && !completed
          return (
            <DayCell
              key={day}
              completed={completed}
              color={habit.color}
              isToday={dateStr === today}
              disabled={isFutureUncompleted}
              dateLabel={dateStr}
              onClick={() => { if (!isFutureUncompleted) onToggle(habit.id, dateStr, completed) }}
            />
          )
        })}

        {/* Progress bar + total */}
        <td className="pl-1.5 w-12">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-sans font-bold text-xs text-cream-700 dark:text-cream-200">{total}</span>
            <div className="w-9 h-1.5 rounded-full bg-cream-200 dark:bg-cream-600 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: habit.color }}
              />
            </div>
            <span className="text-xs text-cream-700 dark:text-cream-400 font-sans">{String(progressPct).padStart(2, '0')}%</span>
          </div>
        </td>
      </tr>

      {editing && <AddHabitModal editing={habit} onClose={() => setEditing(false)} />}
      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar hábito"
          message={`¿Eliminar "${habit.name}"? Tendrás unos segundos para deshacerlo después.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
      {celebrating && (
        <StreakCelebration
          habitName={habit.name}
          level={celebrating.level}
          streak={celebrating.streak}
          onDismiss={() => setCelebrating(null)}
        />
      )}
    </>
  )
}
