import { useEffect, useState } from 'react'
import { PencilSimple, Archive, Trash, DotsSixVertical, DotsThreeVertical, CalendarBlank } from '@phosphor-icons/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Habit, useDeleteHabit, useUpdateHabit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import DayCell from './DayCell'
import AddHabitModal from './AddHabitModal'
import ConfirmDialog from './ConfirmDialog'
import StreakCelebration from './StreakCelebration'
import Toast from './Toast'
import { pad, calcStreak, calcBestStreak, habitDaysElapsed, habitPeriodsElapsed, countCompletedPeriods, isPeriodLocked, isWeekday } from '@/lib/date-utils'
import { getStreakLevel, type StreakLevel } from '@/lib/streak-levels'
import { FREQUENCY_LABELS, FREQUENCY_BADGE_STYLES } from '@/lib/habit-presets'

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
  /** Day-of-month numbers visible below the `sm` breakpoint (current mobile week). */
  mobileVisibleDays: Set<number>
  onToggle: (habitId: string, date: string, isCompleted: boolean) => void
}

export default function HabitRow({ habit, days, monthStr, today, totalDays, completions, showStreak = true, mobileVisibleDays, onToggle }: HabitRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [celebrating, setCelebrating] = useState<{ level: StreakLevel; streak: number } | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const deleteHabit = useDeleteHabit()
  const updateHabit = useUpdateHabit()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })

  const completedDates = new Set(
    completions.filter((c) => c.habit_id === habit.id).map((c) => c.date),
  )

  const total = completedDates.size
  const streak = calcStreak(completedDates)
  const streakLevel = showStreak ? getStreakLevel(streak) : null
  // Celebration triggers off the best run ever logged, not just the streak
  // ending today — backfilling an old 3-in-a-row (now that any past day can
  // be checked) is just as worth celebrating as building one in real time.
  const bestStreak = calcBestStreak(completedDates)

  useEffect(() => {
    if (!showStreak) return

    // If the best streak dropped since we last saw it (a backfilled day got
    // unchecked), forget which tiers were celebrated so rebuilding past them
    // celebrates again.
    const lastKey = lastStreakKey(habit.id)
    const lastBest = Number(localStorage.getItem(lastKey) ?? 0)
    if (bestStreak < lastBest) {
      localStorage.removeItem(celebratedKey(habit.id))
    }
    localStorage.setItem(lastKey, String(bestStreak))

    const bestLevel = getStreakLevel(bestStreak)
    if (!bestLevel) return
    const key = celebratedKey(habit.id)
    const lastCelebrated = Number(localStorage.getItem(key) ?? 0)
    if (bestLevel.days > lastCelebrated) {
      localStorage.setItem(key, String(bestLevel.days))
      // Triggers only when bestStreak crosses a new milestone, not on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebrating({ level: bestLevel, streak: bestStreak })
    }
  }, [habit.id, bestStreak, showStreak])

  const completedUpToToday = countCompletedPeriods(habit.frequency, completedDates, today)
  const effectivePeriods = habitPeriodsElapsed(habit.frequency, habitDaysElapsed(habit.created_at, monthStr, totalDays))
  const progressPct = effectivePeriods > 0 ? Math.min(100, Math.round((completedUpToToday / effectivePeriods) * 100)) : 0

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
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        className="border-b border-cream-200 dark:border-cream-600 group hover:bg-cream-100/50 dark:hover:bg-cream-700/50 transition-colors"
      >
        {/* Habit info cell */}
        <td className="relative py-1.5 pr-2 sticky left-0 bg-cream-50 dark:bg-cream-800 z-10 w-[140px] sm:w-[190px]">
          <div className="flex items-start gap-1">
            <button
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing text-cream-500 hover:text-cream-600 dark:text-cream-500 dark:hover:text-cream-300 shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 rounded"
              aria-label={`Reordenar ${habit.name}`}
            >
              <DotsSixVertical size={12} weight="bold" />
            </button>
            {/* Color accent bar */}
            <div
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: habit.color }}
            />
            <div className="overflow-hidden flex-1 min-w-0 flex flex-col gap-0.5">
              <span
                title={habit.name}
                className="font-sans font-bold text-base text-cream-800 dark:text-cream-100 leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
              >
                {habit.icon} {habit.name}
              </span>
              {showStreak && streak > 0 && (
                <span
                  className="flex items-center gap-1 text-sm leading-tight truncate"
                  style={{ color: streakLevel?.color ?? undefined }}
                  title={`Racha de ${streak} día${streak === 1 ? '' : 's'}`}
                >
                  🔥 Racha: {streak} día{streak === 1 ? '' : 's'}
                </span>
              )}
              <span
                className={[
                  'inline-flex items-center gap-1 self-start px-1.5 py-0.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap',
                  FREQUENCY_BADGE_STYLES[habit.frequency],
                ].join(' ')}
              >
                <CalendarBlank size={11} weight="bold" aria-hidden="true" /> {FREQUENCY_LABELS[habit.frequency]}
              </span>
              {habit.description && (
                <span
                  title={habit.description}
                  className="flex items-center gap-1 text-sm leading-tight text-cream-700 dark:text-cream-400 truncate"
                >
                  ⏱ {habit.description}
                </span>
              )}
            </div>
            {/* Mobile: single compact trigger instead of 3 always-laid-out icons */}
            <div className="relative shrink-0 sm:hidden">
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                className="p-0.5 -m-0.5 rounded text-cream-500 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-cream-700 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
                aria-label={`Más acciones para ${habit.name}`}
                aria-expanded={showMobileMenu}
              >
                <DotsThreeVertical size={14} weight="bold" />
              </button>
              {showMobileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMobileMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-600 rounded-lg shadow-lg py-1 w-36">
                    <button
                      onClick={() => { setEditing(true); setShowMobileMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cream-700 dark:text-cream-200 hover:bg-cream-100 dark:hover:bg-cream-700"
                    >
                      <PencilSimple size={14} /> Editar
                    </button>
                    <button
                      onClick={() => { handleArchive(); setShowMobileMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cream-700 dark:text-cream-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Archive size={14} /> Archivar
                    </button>
                    <button
                      onClick={() => { setConfirmingDelete(true); setShowMobileMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash size={14} /> Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Edit / Archive / Delete — desktop hover overlay, positioned
              absolutely so it doesn't reserve flex width (it used to sit
              inline-but-invisible at rest, permanently stealing the space
              the badge/name text needed to stay on one line). */}
          <div className="hidden sm:flex absolute top-1 right-1 gap-0.5 bg-cream-50 dark:bg-cream-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-cream-700 dark:hover:text-cream-200 hover:bg-cream-200 dark:hover:bg-cream-700 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
              title="Editar hábito"
              aria-label={`Editar ${habit.name}`}
            >
              <PencilSimple size={14} />
            </button>
            <button
              onClick={handleArchive}
              className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
              title="Archivar hábito (ocultar sin eliminar)"
              aria-label={`Archivar ${habit.name}`}
            >
              <Archive size={14} />
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
              title="Eliminar hábito permanentemente"
              aria-label={`Eliminar ${habit.name}`}
            >
              <Trash size={14} />
            </button>
          </div>
        </td>

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = `${monthStr}-${pad(day)}`
          const completed = completedDates.has(dateStr)
          const isFutureUncompleted = dateStr > today && !completed
          const isWeekendOnWeekly = !completed && habit.frequency === 'weekly' && !isWeekday(dateStr)
          const periodLocked = !isFutureUncompleted && !isWeekendOnWeekly && isPeriodLocked(habit.frequency, dateStr, completedDates)
          const isDisabled = isFutureUncompleted || isWeekendOnWeekly || periodLocked
          const disabledReason = isFutureUncompleted ? 'future' : isWeekendOnWeekly ? 'weekend' : 'period-locked'
          return (
            <DayCell
              key={day}
              completed={completed}
              color={habit.color}
              isToday={dateStr === today}
              disabled={isDisabled}
              disabledReason={disabledReason}
              dateLabel={dateStr}
              hiddenOnMobile={!mobileVisibleDays.has(day)}
              onClick={() => { if (!isDisabled) onToggle(habit.id, dateStr, completed) }}
            />
          )
        })}

        {/* Progress bar + total */}
        <td className="pl-1.5 w-9 sm:w-12">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-sans font-bold text-sm text-cream-700 dark:text-cream-200">{total}</span>
            <div className="w-5 h-1.5 rounded-full bg-cream-200 dark:bg-cream-600 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: habit.color }}
              />
            </div>
            <span className="text-xs text-cream-700 dark:text-cream-400 font-sans">{String(progressPct).padStart(2, '0')}%</span>
          </div>
        </td>
      </tr>

      {editing && <AddHabitModal editing={habit} onClose={() => setEditing(false)} onSaved={setSavedMessage} />}
      {savedMessage && (
        <Toast
          message={savedMessage}
          durationMs={3000}
          onTimeout={() => setSavedMessage(null)}
        />
      )}
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
