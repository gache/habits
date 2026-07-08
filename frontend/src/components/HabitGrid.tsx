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
import { getDaysInMonth, pad, todayStr, weekChunks } from '@/lib/date-utils'
import { reorderHabits } from '@/lib/reorder'

interface HabitGridProps {
  habits: Habit[]
  year: number
  month: number // 1-based
  completions: Completion[]
  isError?: boolean
  onToggle: (habitId: string, date: string, isCompleted: boolean) => void
}

export default function HabitGrid({ habits, year, month, completions, isError, onToggle }: HabitGridProps) {
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

  const chunks = useMemo(() => weekChunks(monthStr, days), [monthStr, days])
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
    const fromIndex = orderedHabits.findIndex((h) => h.id === active.id)
    const toIndex = orderedHabits.findIndex((h) => h.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    const reordered = reorderHabits(orderedHabits, fromIndex, toIndex)
    setOrderedHabits(reordered)
    reorderMutation.mutate(reordered, {
      onError: () => setReorderError('No se pudo guardar el nuevo orden'),
    })
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-red-500 font-sans text-sm">
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
            className="w-7 h-7 flex items-center justify-center rounded-full text-cream-600 dark:text-cream-300 disabled:opacity-30 hover:bg-cream-200 dark:hover:bg-cream-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <span className="text-xs font-bold text-cream-700 dark:text-cream-200 font-sans">
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="text-xs w-full" style={{ borderCollapse: 'separate', borderSpacing: '0px 2px' }}>
          <thead>
            <tr className="bg-cream-100 dark:bg-cream-700">
              <th className="py-2 px-2 text-left font-bold text-cream-700 dark:text-cream-200 sticky left-0 bg-cream-100 dark:bg-cream-700 z-10 min-w-[108px] max-w-[108px] sm:min-w-[172px] sm:max-w-[172px] rounded-sm">
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
                      'text-center font-bold py-2 rounded-sm text-base tabular-nums w-7 min-w-[1.75rem] sm:w-8 sm:min-w-[2rem]',
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
                  showStreak={isCurrentMonth}
                  mobileVisibleDays={mobileVisibleDays}
                  onToggle={onToggle}
                />
              ))}
              {orderedHabits.length === 0 && (
                <tr>
                  <td colSpan={days.length + 2} className="text-center py-8 text-cream-700 dark:text-cream-400 font-handwritten text-base">
                    Aún no hay hábitos — ¡agrega uno con el botón +!
                  </td>
                </tr>
              )}
            </tbody>
          </SortableContext>
        </table>
        </DndContext>
      </div>
      {reorderError && (
        <Toast message={reorderError} durationMs={3000} onTimeout={() => setReorderError(null)} />
      )}
    </div>
  )
}
