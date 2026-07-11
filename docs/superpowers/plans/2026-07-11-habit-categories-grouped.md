# Habit Category Grouping (confined drag-reorder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group habits in the tracker grid into four sections by `frequency` (Diario/Semanal/Fin de semana/Mensual), keeping drag-and-drop reorder but confining it to within a category.

**Architecture:** All changes live in `frontend/src/components/HabitGrid.tsx`. Add a pure `groupByFrequency` function to partition `orderedHabits` into ordered category buckets for rendering (one `<tbody>` + `SortableContext` per bucket). Add a pure `resolveDragReorder` function that returns the reordered array on a same-category drag, or `null` on a cross-category drag (guard rejects it, no state change, no mutation). Both functions are exported from `HabitGrid.tsx` so they're unit-testable directly, without simulating dnd-kit pointer events.

**Tech Stack:** React, TypeScript, Vitest + React Testing Library, @dnd-kit/core, @dnd-kit/sortable.

## Global Constraints

- Scope confined to `frontend/src/components/HabitGrid.tsx` — no backend, no data-model, no other component changes (per spec).
- Category order is fixed: `daily → weekly → weekend → monthly` (Diario → Semanal → Fin de semana → Mensual).
- Unknown/unrecognized `frequency` values are silently omitted from every category bucket (not shown, not errored).
- Cross-category drag is rejected silently — no toast, no mutation, dnd-kit's own snap-back animation is the only feedback.
- Category header cell: `className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50"`, `colSpan={totalCols}` where `totalCols = days.length + 2`.
- No changes to `reorderHabits` (`lib/reorder.ts`), `useReorderHabits` (`hooks/useHabits.ts`), or `HabitRow.tsx`.

---

### Task 1: `groupByFrequency` — partition habits into ordered category buckets

**Files:**
- Modify: `frontend/src/components/HabitGrid.tsx`
- Test: `frontend/src/components/__tests__/HabitGrid.test.tsx`

**Interfaces:**
- Produces: `CATEGORY_ORDER: readonly ['daily', 'weekly', 'weekend', 'monthly']`, `CATEGORY_LABELS: Record<Freq, string>`, `groupByFrequency(habits: Habit[]): { freq: Freq; habits: Habit[] }[]` — all exported (named) from `HabitGrid.tsx`. Task 3 renders using these.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/__tests__/HabitGrid.test.tsx`, alongside the existing imports (add `groupByFrequency` to the `import HabitGrid from '../HabitGrid'` line so it becomes `import HabitGrid, { groupByFrequency } from '../HabitGrid'`):

```ts
describe('groupByFrequency', () => {
  it('buckets habits by frequency in fixed category order', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const weekly = makeHabit({ id: 'w1', frequency: 'weekly' })
    const weekend = makeHabit({ id: 'we1', frequency: 'weekend' })
    const monthly = makeHabit({ id: 'm1', frequency: 'monthly' })

    const groups = groupByFrequency([monthly, weekend, weekly, daily])

    expect(groups.map((g) => g.freq)).toEqual(['daily', 'weekly', 'weekend', 'monthly'])
    expect(groups[0].habits).toEqual([daily])
    expect(groups[1].habits).toEqual([weekly])
    expect(groups[2].habits).toEqual([weekend])
    expect(groups[3].habits).toEqual([monthly])
  })

  it('omits categories with no habits', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const groups = groupByFrequency([daily])
    expect(groups).toEqual([{ freq: 'daily', habits: [daily] }])
  })

  it('preserves relative order of habits within a category', () => {
    const first = makeHabit({ id: 'd1', frequency: 'daily' })
    const second = makeHabit({ id: 'd2', frequency: 'daily' })
    const groups = groupByFrequency([second, first])
    expect(groups[0].habits.map((h) => h.id)).toEqual(['d2', 'd1'])
  })

  it('returns an empty array for an empty habit list', () => {
    expect(groupByFrequency([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx -t groupByFrequency`
Expected: FAIL — `groupByFrequency` is not exported from `HabitGrid.tsx` (module has no export named `groupByFrequency`).

- [ ] **Step 3: Implement `groupByFrequency`**

In `frontend/src/components/HabitGrid.tsx`, add near the top of the file, after the existing imports (below the `import { reorderHabits } from '@/lib/reorder'` line):

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx -t groupByFrequency`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HabitGrid.tsx frontend/src/components/__tests__/HabitGrid.test.tsx
git commit -m "feat: add groupByFrequency to HabitGrid"
```

---

### Task 2: `resolveDragReorder` — confine drag reorder to same category

**Files:**
- Modify: `frontend/src/components/HabitGrid.tsx`
- Test: `frontend/src/components/__tests__/HabitGrid.test.tsx`

**Interfaces:**
- Consumes: `Habit` type (`hooks/useHabits.ts`), `reorderHabits` (`lib/reorder.ts`, unchanged signature `reorderHabits<T>(items: T[], fromIndex: number, toIndex: number): T[]`)
- Produces: `resolveDragReorder(habits: Habit[], activeId: string, overId: string): Habit[] | null` — exported (named) from `HabitGrid.tsx`. Task 3's `handleDragEnd` calls this.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/__tests__/HabitGrid.test.tsx` (add `resolveDragReorder` to the same named import as Task 1):

```ts
describe('resolveDragReorder', () => {
  it('reorders when active and over share the same frequency', () => {
    const a = makeHabit({ id: 'd1', frequency: 'daily' })
    const b = makeHabit({ id: 'd2', frequency: 'daily' })
    const c = makeHabit({ id: 'd3', frequency: 'daily' })

    const result = resolveDragReorder([a, b, c], 'd3', 'd1')

    expect(result?.map((h) => h.id)).toEqual(['d3', 'd1', 'd2'])
  })

  it('returns null when active and over have different frequencies', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    const weekly = makeHabit({ id: 'w1', frequency: 'weekly' })

    expect(resolveDragReorder([daily, weekly], 'd1', 'w1')).toBeNull()
  })

  it('returns null when activeId is not found', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    expect(resolveDragReorder([daily], 'missing', 'd1')).toBeNull()
  })

  it('returns null when overId is not found', () => {
    const daily = makeHabit({ id: 'd1', frequency: 'daily' })
    expect(resolveDragReorder([daily], 'd1', 'missing')).toBeNull()
  })

  it('preserves relative order of habits from other categories', () => {
    const d1 = makeHabit({ id: 'd1', frequency: 'daily' })
    const w1 = makeHabit({ id: 'w1', frequency: 'weekly' })
    const d2 = makeHabit({ id: 'd2', frequency: 'daily' })
    const w2 = makeHabit({ id: 'w2', frequency: 'weekly' })
    const d3 = makeHabit({ id: 'd3', frequency: 'daily' })
    // Dragging d1 (first daily) to sit after d3 (last daily) should leave
    // w1/w2 exactly where they were, with d1 now last among the dailies.
    const result = resolveDragReorder([d1, w1, d2, w2, d3], 'd1', 'd3')
    expect(result?.map((h) => h.id)).toEqual(['w1', 'd2', 'w2', 'd3', 'd1'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx -t resolveDragReorder`
Expected: FAIL — `resolveDragReorder` is not exported from `HabitGrid.tsx`.

- [ ] **Step 3: Implement `resolveDragReorder`**

In `frontend/src/components/HabitGrid.tsx`, add directly below the `groupByFrequency` function from Task 1:

```ts
export function resolveDragReorder(habits: Habit[], activeId: string, overId: string): Habit[] | null {
  const activeHabit = habits.find((h) => h.id === activeId)
  const overHabit = habits.find((h) => h.id === overId)
  if (!activeHabit || !overHabit || activeHabit.frequency !== overHabit.frequency) return null
  const fromIndex = habits.findIndex((h) => h.id === activeId)
  const toIndex = habits.findIndex((h) => h.id === overId)
  return reorderHabits(habits, fromIndex, toIndex)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx -t resolveDragReorder`
Expected: PASS (5 tests)

- [ ] **Step 5: Wire `resolveDragReorder` into `handleDragEnd`**

In `frontend/src/components/HabitGrid.tsx`, replace the existing `handleDragEnd` body:

```ts
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
```

with:

```ts
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
```

- [ ] **Step 6: Run the full HabitGrid test file to confirm nothing broke**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx`
Expected: PASS (all tests, including the pre-existing ones from before this plan)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/HabitGrid.tsx frontend/src/components/__tests__/HabitGrid.test.tsx
git commit -m "feat: confine habit drag-reorder to same category"
```

---

### Task 3: Render grouped `<tbody>` sections with category headers

**Files:**
- Modify: `frontend/src/components/HabitGrid.tsx`
- Test: `frontend/src/components/__tests__/HabitGrid.test.tsx`

**Interfaces:**
- Consumes: `groupByFrequency`, `CATEGORY_LABELS` (Task 1); `SortableContext`, `verticalListSortingStrategy` (`@dnd-kit/sortable`, already imported)
- Produces: final visible grouped grid — no further tasks depend on this.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/__tests__/HabitGrid.test.tsx`:

```ts
it('renders a category header row per non-empty frequency group, in fixed order', () => {
  const daily = makeHabit({ id: 'd1', name: 'Leer', frequency: 'daily' })
  const monthly = makeHabit({ id: 'm1', name: 'Pagar Renta', frequency: 'monthly' })
  render(
    <HabitGrid
      habits={[monthly, daily]}
      year={2026}
      month={7}
      completions={[]}
      onToggle={vi.fn()}
    />,
    { wrapper: wrapper() },
  )

  const headers = screen.getAllByText(/^(Diario|Semanal|Fin de semana|Mensual)$/)
  expect(headers.map((el) => el.textContent)).toEqual(['Diario', 'Mensual'])
})

it('omits category headers for frequencies with no habits', () => {
  render(
    <HabitGrid
      habits={[makeHabit({ frequency: 'daily' })]}
      year={2026}
      month={7}
      completions={[]}
      onToggle={vi.fn()}
    />,
    { wrapper: wrapper() },
  )

  expect(screen.queryByText('Semanal')).not.toBeInTheDocument()
  expect(screen.queryByText('Fin de semana')).not.toBeInTheDocument()
  expect(screen.queryByText('Mensual')).not.toBeInTheDocument()
})

it('still renders every habit row under its category', () => {
  const daily = makeHabit({ id: 'd1', name: 'Leer', frequency: 'daily' })
  const weekend = makeHabit({ id: 'we1', name: 'Limpiar', frequency: 'weekend' })
  render(
    <HabitGrid
      habits={[daily, weekend]}
      year={2026}
      month={7}
      completions={[]}
      onToggle={vi.fn()}
    />,
    { wrapper: wrapper() },
  )

  expect(screen.getByText(/Leer/)).toBeInTheDocument()
  expect(screen.getByText(/Limpiar/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx -t "category header"`
Expected: FAIL — no category header text rendered yet (grid still renders one flat `<tbody>`).

- [ ] **Step 3: Implement grouped rendering**

In `frontend/src/components/HabitGrid.tsx`, replace the existing single `SortableContext` + `<tbody>` block:

```tsx
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
```

with:

```tsx
          {groupByFrequency(orderedHabits).map((group) => (
            <SortableContext key={group.freq} items={group.habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50"
                  >
                    {CATEGORY_LABELS[group.freq]}
                  </td>
                </tr>
                {group.habits.map((habit) => (
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
              </tbody>
            </SortableContext>
          ))}
          {orderedHabits.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={days.length + 2} className="text-center py-8 text-cream-700 dark:text-cream-400 font-handwritten text-lg">
                  Aún no hay hábitos — ¡agrega uno con el botón +!
                </td>
              </tr>
            </tbody>
          )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitGrid.test.tsx`
Expected: PASS (all tests in the file, old and new)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HabitGrid.tsx frontend/src/components/__tests__/HabitGrid.test.tsx
git commit -m "feat: group habit grid rows by category"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — all tests including the ones from Tasks 1-3 (no regressions in `HabitRow.test.tsx`, `AddHabitModal.test.tsx`, etc.)

- [ ] **Step 2: Typecheck and build**

Run: `cd frontend && npm run build`
Expected: PASS — `tsc -b` reports no errors, `vite build` succeeds.

- [ ] **Step 3: Manual check in the running app**

Run: `cd backend && ./run-dev.sh` (in one terminal), `cd frontend && npm run dev` (in another).
Open the app, go to the tracker view for a month with habits across at least two frequencies. Confirm:
- Habits appear under "Diario"/"Semanal"/"Fin de semana"/"Mensual" headers in that order.
- Dragging a habit within its own category reorders it and persists (reload the page, order should stick).
- Dragging a habit onto a row in a different category snaps back and does not reorder or persist.

No code changes in this step — it's a manual confirmation before considering the feature done.
