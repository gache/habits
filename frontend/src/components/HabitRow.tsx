import { memo, useEffect, useState } from 'react'
import { PencilSimple, Archive, Trash, DotsSixVertical, DotsThreeVertical, CalendarBlank } from '@phosphor-icons/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'
import { type Habit, useDeleteHabit, useRestoreHabit, useUpdateHabit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import DayCell from './DayCell'
import AddHabitModal from './AddHabitModal'
import ConfirmDialog from './ConfirmDialog'
import StreakCelebration from './StreakCelebration'
import Toast from './Toast'
import { pad, calcPeriodStreak, calcBestPeriodStreak, habitDaysElapsed, habitPeriodsElapsed, countCompletedPeriods } from '@/lib/date-utils'
import { getStreakLevel, periodUnitLabel, type StreakLevel } from '@/lib/streak-levels'
import { FREQUENCY_LABELS, FREQUENCY_BADGE_STYLES } from '@/lib/habit-presets'
import { computeDayCellState, computeMilestoneUpdate } from '@/lib/habit-row-utils'

const celebratedKey = (habitId: string) => `habit-streak-celebrated:${habitId}`
const lastStreakKey = (habitId: string) => `habit-streak-last:${habitId}`

interface HabitRowProps {
  habit: Habit
  days: number[]
  monthStr: string
  today: string       // "YYYY-MM-DD"
  totalDays: number   // days elapsed (for progress bar)
  completions: Completion[]
  /** Wider-than-the-displayed-month completions, used only for streak
   * calculations so a streak crossing a month boundary isn't undercounted.
   * Falls back to `completions` when not given (e.g. in tests that don't
   * care about cross-month streak behavior). */
  streakCompletions?: Completion[]
  showStreak?: boolean
  /** Day-of-month numbers visible below the `sm` breakpoint (current mobile week). */
  mobileVisibleDays: Set<number>
  onToggle: (habitId: string, date: string, isCompleted: boolean) => void
}

function HabitRow({ habit, days, monthStr, today, totalDays, completions, streakCompletions, showStreak = true, mobileVisibleDays, onToggle }: HabitRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [celebrating, setCelebrating] = useState<{ level: StreakLevel; streak: number } | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [pendingRestoreDates, setPendingRestoreDates] = useState<string[]>([])
  const deleteHabit = useDeleteHabit()
  const restoreHabit = useRestoreHabit()
  const updateHabit = useUpdateHabit()
  const qc = useQueryClient()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })

  const completedDates = new Set(
    completions.filter((c) => c.habit_id === habit.id).map((c) => c.date),
  )
  // Streaks need to see past month boundaries — completedDates above is
  // scoped to the displayed month only, which would make an ongoing streak
  // look broken or reset to 0 right after nav'ing to a new month.
  const streakDates = new Set(
    (streakCompletions ?? completions).filter((c) => c.habit_id === habit.id).map((c) => c.date),
  )

  const total = completedDates.size
  const streak = calcPeriodStreak(habit.frequency, streakDates)
  const streakLevel = showStreak ? getStreakLevel(streak, habit.frequency) : null
  // Celebration triggers off the best run ever logged, not just the streak
  // ending today — backfilling an old 3-in-a-row (now that any past day can
  // be checked) is just as worth celebrating as building one in real time.
  const bestStreak = calcBestPeriodStreak(habit.frequency, streakDates)

  useEffect(() => {
    // Deliberately NOT gated on `showStreak` (current-month-only) — bestStreak
    // already spans a 12-month window, so backfilling a milestone while
    // looking at a past month is just as real as hitting it live, and should
    // still celebrate (showStreak only controls whether the small racha
    // badge renders, not whether a real milestone gets detected).

    const lastKey = lastStreakKey(habit.id)
    const lastBest = Number(localStorage.getItem(lastKey) ?? 0)
    const key = celebratedKey(habit.id)
    const lastCelebrated = Number(localStorage.getItem(key) ?? 0)

    const { forgetPrevious, milestone, newCelebratedValue } = computeMilestoneUpdate({
      frequency: habit.frequency,
      bestStreak,
      lastBest,
      lastCelebrated,
    })

    if (forgetPrevious) localStorage.removeItem(key)
    localStorage.setItem(lastKey, String(bestStreak))

    if (milestone) {
      localStorage.setItem(key, String(newCelebratedValue))
      // Triggers only when bestStreak crosses a new milestone, not on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebrating(milestone)
    }
  }, [habit.id, bestStreak, habit.frequency])

  const completedUpToToday = countCompletedPeriods(habit.frequency, completedDates, today)
  const effectivePeriods = habitPeriodsElapsed(habit.frequency, habitDaysElapsed(habit.created_at, monthStr, totalDays))
  const progressPct = effectivePeriods > 0 ? Math.min(100, Math.round((completedUpToToday / effectivePeriods) * 100)) : 0

  const handleDelete = () => {
    setConfirmingDelete(false)
    // Snapshot this month's completions now — the DELETE below wipes them
    // server-side immediately, so this is the only copy left if the user
    // hits "Deshacer" and we need to recreate them.
    setPendingRestoreDates(Array.from(completedDates))
    setDeleting(true)
    // Fire the real delete now rather than after the undo window: deferring
    // it lived only in a client-side setTimeout, so an F5 or nav during the
    // window silently cancelled it — the toast said "eliminado" but nothing
    // was ever sent. Committing immediately means a refresh can't lose it;
    // "Deshacer" undoes via the restore endpoint instead of never-deleting.
    deleteHabit.mutate({ id: habit.id, month: monthStr })
  }

  const handleUndo = () => {
    restoreHabit.mutate({ id: habit.id, month: monthStr, dates: pendingRestoreDates })
    setDeleting(false)
  }

  const handleUndoWindowClosed = () => {
    // Nothing to restore — sync the UI (this row, percentages elsewhere)
    // with the deletion that already happened on the server.
    qc.invalidateQueries({ queryKey: ['habits'] })
    qc.invalidateQueries({ queryKey: ['completions', monthStr] })
  }

  const handleArchive = () => {
    updateHabit.mutate({ id: habit.id, updates: { active: false } })
  }

  if (deleting) {
    return (
      <Toast
        message={`"${habit.name}" eliminado`}
        actionLabel="Deshacer"
        onAction={handleUndo}
        onTimeout={handleUndoWindowClosed}
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
                  title={`Racha de ${streak} ${periodUnitLabel(habit.frequency, streak)}`}
                >
                  🔥 Racha: {streak} {periodUnitLabel(habit.frequency, streak)}
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
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Cerrar menú"
                    onClick={() => setShowMobileMenu(false)}
                  />
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
              title="Eliminar hábito de este mes"
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
          const { isDisabled, disabledReason } = computeDayCellState(habit.frequency, dateStr, today, completedDates)
          return (
            <DayCell
              key={day}
              habitId={habit.id}
              date={dateStr}
              completed={completed}
              color={habit.color}
              isToday={dateStr === today}
              disabled={isDisabled}
              disabledReason={disabledReason}
              hiddenOnMobile={!mobileVisibleDays.has(day)}
              onToggle={onToggle}
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
          message={`¿Eliminar "${habit.name}" de este mes? Tendrás unos segundos para deshacerlo después.`}
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
          frequency={habit.frequency}
          onDismiss={() => setCelebrating(null)}
        />
      )}
    </>
  )
}

export default memo(HabitRow)
