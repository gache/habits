# Habit Drag-to-Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user drag habit rows up/down in the Tracker grid to set a custom display order, persisted via the existing `Habit.order` field.

**Architecture:** Frontend-only change. Add `@dnd-kit/core` + `@dnd-kit/sortable` for mouse/touch/keyboard drag reordering of `<tr>` rows inside `HabitGrid`'s `<tbody>`. A pure `reorderHabits` helper computes the new array order independent of the drag library (unit-testable). A new `useReorderHabits` mutation PATCHes the changed `order` values to the backend, which already sorts `GET /api/habits` by `order` and accepts `order` on `PATCH /api/habits/{id}` — no backend changes.

**Tech Stack:** React 18, TanStack Query v5, Vitest + Testing Library (`renderHook`), dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-07-habit-drag-reorder-design.md`
- Reordering applies only to the active-habit list in `Tracker`/`HabitGrid`. `History` is out of scope.
- No backend changes — `Habit.order` (int), `GET /api/habits` sort-by-order, and `PATCH /api/habits/{id}` already exist (`backend/routers/habits.py`).
- Only the grip handle is draggable, not the whole row (existing edit/archive/delete hover icons and day-cell clicks must keep working undisturbed).
- Commits are checkpoints, not automatic — this project's standing rule is no `git commit` without the user explicitly confirming at that point in the session, even though each task ends with a "Commit" step below.

---

### Task 1: Add dnd-kit dependencies

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`

**Interfaces:**
- Produces: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` importable in later tasks.

- [ ] **Step 1: Install the packages**

Run (from `frontend/`):
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify the install**

Run: `node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); require('@dnd-kit/utilities'); console.log('ok')"`
Expected output: `ok`

- [ ] **Step 3: Typecheck still passes**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found` (no code uses the new packages yet, this just confirms the install didn't break anything)

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add dnd-kit for habit drag reordering"
```

---

### Task 2: `reorderHabits` pure helper

**Files:**
- Create: `frontend/src/lib/reorder.ts`
- Test: `frontend/src/lib/__tests__/reorder.test.ts`

**Interfaces:**
- Consumes: nothing (pure array logic, no dependency on `Habit` shape beyond needing *some* array).
- Produces: `reorderHabits<T>(items: T[], fromIndex: number, toIndex: number): T[]` — used by Task 4 (`HabitGrid.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/__tests__/reorder.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { reorderHabits } from '../reorder'

describe('reorderHabits', () => {
  it('moves an item later in the list', () => {
    expect(reorderHabits(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item earlier in the list', () => {
    expect(reorderHabits(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves an item to the start', () => {
    expect(reorderHabits(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('moves an item to the end', () => {
    expect(reorderHabits(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('is a no-op when fromIndex equals toIndex', () => {
    const input = ['a', 'b', 'c']
    expect(reorderHabits(input, 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c']
    reorderHabits(input, 0, 2)
    expect(input).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/reorder.test.ts`
Expected: FAIL — `Cannot find module '../reorder'`

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/reorder.ts`:
```ts
/**
 * Moves the item at fromIndex to toIndex, returning a new array — used to
 * compute a habit's new display order after a drag-and-drop reorder.
 */
export function reorderHabits<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/reorder.test.ts`
Expected: `PASS` — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reorder.ts frontend/src/lib/__tests__/reorder.test.ts
git commit -m "feat: add reorderHabits pure helper for drag reordering"
```

---

### Task 3: `useReorderHabits` mutation

**Files:**
- Modify: `frontend/src/hooks/useHabits.ts`
- Test: `frontend/src/hooks/__tests__/useHabits.test.tsx`

**Interfaces:**
- Consumes: `Habit` type (already defined in `useHabits.ts`), `api` from `@/lib/api` (already imported in this file).
- Produces: `useReorderHabits()` — a mutation hook. `.mutate(orderedHabits: Habit[], { onError? })` where `orderedHabits` is the full habit list in its new display order. Used by Task 4 (`HabitGrid.tsx`).

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/hooks/__tests__/useHabits.test.tsx` (new `describe` block, same file — extend the existing `import` line to include `useReorderHabits`):

```ts
import { useHabits, useCreateHabit, useDeleteHabit, useReorderHabits } from '../useHabits'
```

```ts
describe('useReorderHabits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PATCHes only habits whose order actually changed, as 1-based positions', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    const habits = [
      { id: 'a', order: 2 },
      { id: 'b', order: 1 },
      { id: 'c', order: 3 },
    ] as never

    const { result } = renderHook(() => useReorderHabits(), { wrapper: wrapper() })
    result.current.mutate(habits)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // 'a' moves from order 2 -> 1, 'b' moves from order 1 -> 2, 'c' stays at 3
    expect(api.patch).toHaveBeenCalledWith('/api/habits/a', { order: 1 })
    expect(api.patch).toHaveBeenCalledWith('/api/habits/b', { order: 2 })
    expect(api.patch).toHaveBeenCalledTimes(2)
  })

  it('does nothing when the order is already correct', async () => {
    const habits = [
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ] as never

    const { result } = renderHook(() => useReorderHabits(), { wrapper: wrapper() })
    result.current.mutate(habits)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useHabits.test.tsx`
Expected: FAIL — `useReorderHabits is not a function` (or similar import error)

- [ ] **Step 3: Write the implementation**

Add to `frontend/src/hooks/useHabits.ts`, after `useDeleteHabit`:
```ts
export function useReorderHabits() {
  const qc = useQueryClient()
  return useMutation<void, Error, Habit[]>({
    mutationFn: async (orderedHabits) => {
      const changed = orderedHabits
        .map((habit, index) => ({ habit, order: index + 1 }))
        .filter(({ habit, order }) => habit.order !== order)
      await Promise.all(
        changed.map(({ habit, order }) => api.patch(`/api/habits/${habit.id}`, { order })),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
    onError: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useHabits.test.tsx`
Expected: `PASS` — all tests in the file passing (existing 4 + new 2)

- [ ] **Step 5: Full frontend suite still green**

Run: `npx vitest run`
Expected: all tests passing (41 total: previous 39 + 2 new here; Task 2 added 6 more when run together, so the running total by end of this task is 45)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useHabits.ts frontend/src/hooks/__tests__/useHabits.test.tsx
git commit -m "feat: add useReorderHabits mutation to persist drag reorder"
```

---

### Task 4: Wire drag-and-drop into `HabitGrid` and `HabitRow`

**Files:**
- Modify: `frontend/src/components/HabitGrid.tsx`
- Modify: `frontend/src/components/HabitRow.tsx`

**Interfaces:**
- Consumes: `reorderHabits` (Task 2), `useReorderHabits` (Task 3), `Habit` type, existing `Toast` component (`@/components/Toast`, props `message`, `durationMs`, `onTimeout` — see current usage in `HabitRow.tsx`).
- Produces: nothing further downstream — this is the final integration task.

- [ ] **Step 1: Add local reorder state + DnD context to `HabitGrid.tsx`**

Replace the top of `frontend/src/components/HabitGrid.tsx` (imports and component signature) with:
```tsx
import { useEffect, useState } from 'react'
import { WarningCircle } from '@phosphor-icons/react'
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
import { getDaysInMonth, pad, todayStr } from '@/lib/date-utils'
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
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthStr = `${year}-${pad(month)}`
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth

  // Local copy so a drag reorders instantly, without waiting on the
  // habits-query refetch that follows the persist mutation.
  const [orderedHabits, setOrderedHabits] = useState(habits)
  useEffect(() => setOrderedHabits(habits), [habits])
  const [reorderError, setReorderError] = useState<string | null>(null)
  const reorderMutation = useReorderHabits()

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
    <div className="overflow-x-auto grid-scroll rounded-lg border border-cream-300 dark:border-cream-600">
      <table className="text-xs w-full" style={{ borderCollapse: 'separate', borderSpacing: '0px 2px' }}>
        <thead>
          <tr className="bg-cream-100 dark:bg-cream-700">
            <th className="py-2 px-2 text-left font-bold text-cream-700 dark:text-cream-200 sticky left-0 bg-cream-100 dark:bg-cream-700 z-10 min-w-[172px] max-w-[172px] rounded-sm">
              HÁBITO
            </th>
            {days.map((d) => {
              const dateStr = `${monthStr}-${pad(d)}`
              const isToday = dateStr === today
              return (
                <th
                  key={d}
                  className={[
                    'text-center font-bold py-2 rounded-sm text-base tabular-nums w-8 min-w-[2rem]',
                    isToday ? 'text-cream-800 dark:text-cream-100 underline underline-offset-2' : 'text-cream-600 dark:text-cream-300',
                  ].join(' ')}
                >
                  {d}
                </th>
              )
            })}
            <th className="px-1.5 text-center font-bold text-cream-700 dark:text-cream-200 w-12 rounded-sm">TOTAL</th>
          </tr>
        </thead>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
        </DndContext>
      </table>
      {reorderError && (
        <Toast message={reorderError} durationMs={3000} onTimeout={() => setReorderError(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck (expect errors — `HabitRow` doesn't accept sortable props yet)**

Run: `npx tsc --noEmit`
Expected: no errors from `HabitGrid.tsx` itself at this point (it doesn't pass any new props to `HabitRow`, sortable wiring lives inside `HabitRow` in the next step) — if you see errors here, stop and re-check the file matches the block above exactly before continuing.

- [ ] **Step 3: Add the drag handle + sortable wiring inside `HabitRow.tsx`**

In `frontend/src/components/HabitRow.tsx`, add to the top imports:
```tsx
import { PencilSimple, Archive, Trash, DotsSixVertical } from '@phosphor-icons/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```
(This replaces the existing `import { PencilSimple, Archive, Trash } from '@phosphor-icons/react'` line — same import, one added name.)

Inside the component body, right after the existing `const deleteHabit = useDeleteHabit()` / `const updateHabit = useUpdateHabit()` lines, add:
```tsx
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
```

Change the `<tr>` opening tag from:
```tsx
      <tr className="border-b border-cream-200 dark:border-cream-600 group hover:bg-cream-100/50 dark:hover:bg-cream-700/50 transition-colors">
```
to:
```tsx
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        className="border-b border-cream-200 dark:border-cream-600 group hover:bg-cream-100/50 dark:hover:bg-cream-700/50 transition-colors"
      >
```

Add the grip handle as the first child inside the existing `<div className="flex items-start gap-1.5">` in the habit-info `<td>` (right before the `{/* Color accent bar */}` div):
```tsx
            <button
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing text-cream-400 hover:text-cream-600 dark:text-cream-600 dark:hover:text-cream-300 shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 rounded"
              aria-label={`Reordenar ${habit.name}`}
            >
              <DotsSixVertical size={14} weight="bold" />
            </button>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 5: Full frontend test suite still green**

Run: `npx vitest run`
Expected: all tests passing (no test touches `HabitRow`/`HabitGrid` rendering directly today, so this confirms nothing else broke)

- [ ] **Step 6: Manual browser verification**

This can't be meaningfully unit-tested (jsdom doesn't simulate dnd-kit's pointer sensors). With the dev server running:
1. Open the Tracker page, confirm each habit row shows a `⠿` grip icon to the left of the color accent bar.
2. Press and drag a row's grip up or down past another row — confirm the row visually reorders during the drag (not just on drop).
3. Release — confirm the new order sticks.
4. Reload the page — confirm the new order persisted (this proves the `PATCH` calls landed and `GET /api/habits` now returns the new order).
5. Tab to a grip handle with keyboard focus, press Space to pick it up, Arrow Up/Down to move it, Space again to drop — confirm keyboard reordering works as a dnd-kit built-in.
6. Confirm the existing edit/archive/delete icons and day-checkbox clicks in that row still work after the drag-handle change (they sit in separate DOM elements from the grip, so listeners shouldn't leak onto them).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/HabitGrid.tsx frontend/src/components/HabitRow.tsx
git commit -m "feat: drag-and-drop habit reordering in the tracker grid"
```

---

## Self-Review Notes

- **Spec coverage:** drag handle + dnd-kit (Task 4), pure `reorderHabits` helper (Task 2), `useReorderHabits` PATCH-only-changed persistence (Task 3), error toast on failed persist (Task 4 Step 1), scope limited to `HabitGrid`/Tracker (no `History` changes anywhere in this plan) — all covered.
- **Type consistency:** `reorderHabits` (Task 2) is generic (`<T>`) so it works both in its own array-of-strings tests and later with `Habit[]` in `HabitGrid.tsx` — no signature mismatch. `useReorderHabits` (Task 3) takes `Habit[]` and is called with `reordered` (also `Habit[]`) in Task 4 — consistent.
- **No placeholders:** every step has runnable code or an exact command with expected output.
