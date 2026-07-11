import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight, WarningCircle } from '@phosphor-icons/react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { type Habit, useReorderHabits } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import HabitRow from './HabitRow'
import Toast from './Toast'
import { getDaysInMonth, pad, todayStr, dayChunks } from '@/lib/date-utils'
import { reorderHabits } from '@/lib/reorder'

export const CATEGORY_ORDER = ['daily', 'weekly', 'weekend', 'monthly'] as const
type Freq = typeof CATEGORY_ORDER[number]

export const CATEGORY_LABELS: Record<Freq, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  weekend: 'Fin de semana',
  monthly: 'Mensual',
}

export function groupByFrequency(habits: Habit[]) {
  return CATEGORY_ORDER
    .map((freq) => ({ freq, habits: habits.filter((h) => h.frequency === freq) }))
    .filter((g) => g.habits.length > 0)
}

export function resolveDragReorder(habits: Habit[], activeId: string, overId: string): Habit[] | null {
  const activeHabit = habits.find((h) => h.id === activeId)
  const overHabit = habits.find((h) => h.id === overId)
  if (!activeHabit || !overHabit || activeHabit.frequency !== overHabit.frequency) return null
  const fromIndex = habits.findIndex((h) => h.id === activeId)
  const toIndex = habits.findIndex((h) => h.id === overId)
  return reorderHabits(habits, fromIndex, toIndex)
}

interface HabitGridProps {
  habits: Habit[]
  year: number
  month: number // 1-based
  completions: Completion[]
  /** Wider-than-the-displayed-month completions, used only for streak
   * calculations so they don't break at month boundaries. Defaults to
   * `completions` if not given (e.g. in tests that don't care about streaks). */
  streakCompletions?: Completion[]
  isError?: boolean
  onToggle: (habitId: string, date: string, isCompleted: boolean) => void
}

export default function HabitGrid({ habits, year, month, completions, streakCompletions, isError, onToggle }: HabitGridProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  const monthStr = `${year}-${pad(month)}`
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth

  // Local copy so a drag reorders instantly, without waiting on the
  // habits-query refetch that follows the persist mutation. Adjusted
  // during render (React's recommended pattern for syncing state to a
  // prop change) rather than in an effect, to avoid an extra render pass.
  const [orderedHabits, setOrderedHabits] = useState(habits)
  const [prevHabits, setPrevHabits] = useState(habits)
  if (habits !== prevHabits) {
    setPrevHabits(habits)
    setOrderedHabits(habits)
  }
  const [reorderError, setReorderError] = useState<string | null>(null)
  const reorderMutation = useReorderHabits()

  // 4 (not 5) on mobile: the larger post-font-bump touch targets (40px) and
  // full habit names don't fit 5 columns without a horizontal scroll.
  const chunks = useMemo(() => dayChunks(days, 4), [days])
  // Same render-time-adjustment pattern: re-pick the default week only when
  // the month itself changes, not on every chunk recompute (which would
  // fight the user's manual nav).
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const reordered = resolveDragReorder(orderedHabits, String(active.id), String(over.id))
    if (!reordered) return
    setOrderedHabits(reordered)
    reorderMutation.mutate(reordered, {
      onError: () => setReorderError('No se pudo guardar el nuevo orden'),
    })
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-red-500 font-sans text-base">
        <WarningCircle size={18} weight="fill" aria-hidden="true" />
        No se pudieron cargar los hábitos. Revisa tu conexión e intenta de nuevo.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-cream-300 dark:border-cream-600">
      {chunks.length > 1 && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-cream-300 dark:border-cream-600 sm:hidden">
          <button
            onClick={() => setMobileWeekIndex((i) => Math.max(0, i - 1))}
            disabled={mobileWeekIndex === 0}
            aria-label="Semana anterior"
            className="w-7 h-7 flex items-center justify-center rounded-full text-cream-600 dark:text-cream-300 disabled:opacity-30 hover:bg-cream-200 dark:hover:bg-cream-700 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
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
            className="w-7 h-7 flex items-center justify-center rounded-full text-cream-600 dark:text-cream-300 disabled:opacity-30 hover:bg-cream-200 dark:hover:bg-cream-700 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
      )}
      <div className="relative">
      <div className="overflow-x-auto grid-scroll">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* table-fixed makes the declared column widths authoritative — without
            it, unbreakable content (e.g. "100%") forces auto-layout to widen
            a column past its budgeted share, blowing the mobile-page fit. */}
        <table className="text-sm w-full table-fixed" style={{ borderCollapse: 'separate', borderSpacing: '0px 2px' }}>
          <thead>
            <tr className="bg-cream-100 dark:bg-cream-700">
              <th className="py-2 px-2 text-left font-bold text-cream-700 dark:text-cream-200 sticky left-0 bg-cream-100 dark:bg-cream-700 z-10 w-[140px] sm:w-[190px] rounded-sm">
                HÁBITO
              </th>
              {days.map((d) => {
                const dateStr = `${monthStr}-${pad(d)}`
                const isToday = dateStr === today
                const hiddenOnMobile = !mobileVisibleDays.has(d)
                return (
                  <th
                    key={d}
                    className={[
                      'text-center font-bold py-2 rounded-sm text-lg tabular-nums w-10 min-w-[2.5rem] sm:w-[30px]',
                      isToday ? 'text-cream-800 dark:text-cream-100 underline underline-offset-2' : 'text-cream-600 dark:text-cream-300',
                      hiddenOnMobile ? 'hidden sm:table-cell' : '',
                    ].join(' ')}
                  >
                    {d}
                  </th>
                )
              })}
              <th className="px-1.5 text-center font-bold text-cream-700 dark:text-cream-200 w-9 sm:w-12 rounded-sm">TOTAL</th>
            </tr>
          </thead>
          <SortableContext items={orderedHabits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {orderedHabits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  days={days}
                  monthStr={monthStr}
                  today={today}
                  totalDays={daysElapsed}
                  completions={completions}
                  streakCompletions={streakCompletions}
                  showStreak={isCurrentMonth}
                  mobileVisibleDays={mobileVisibleDays}
                  onToggle={onToggle}
                />
              ))}
              {orderedHabits.length === 0 && (
                <tr>
                  <td colSpan={days.length + 2} className="text-center py-8 text-cream-700 dark:text-cream-400 font-handwritten text-lg">
                    Aún no hay hábitos — ¡agrega uno con el botón +!
                  </td>
                </tr>
              )}
            </tbody>
          </SortableContext>
        </table>
        </DndContext>
      </div>
      {/* Bigger fonts mean the 5-day mobile page can run a bit wider than the
          screen — this hints there's more to scroll to, instead of an
          abrupt hard cut at the edge. */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-cream-50 dark:from-cream-800 to-transparent rounded-r-lg block sm:hidden"
        aria-hidden="true"
      />
      </div>
      {reorderError && (
        <Toast message={reorderError} durationMs={3000} onTimeout={() => setReorderError(null)} />
      )}
    </div>
  )
}
