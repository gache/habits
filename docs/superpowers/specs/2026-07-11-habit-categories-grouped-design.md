# Habit Category Grouping (with confined drag-reorder) — Design Spec

**Date:** 2026-07-11
**Scope:** `frontend/src/components/HabitGrid.tsx` only
**Status:** Approved
**Supersedes:** `2026-07-09-habit-categories-design.md` (that spec removed drag-and-drop entirely; this one keeps it, scoped per category)

---

## Summary

Group habits in the tracker grid into four sections by their existing `frequency` field, in fixed order. Drag-and-drop reordering is kept, but a drag can only reorder a habit within its own category — dragging across categories is rejected and the row snaps back. Per-habit frequency badges already exist in `HabitRow.tsx` (`FREQUENCY_LABELS` / `FREQUENCY_BADGE_STYLES` in `habit-presets.ts`) and are unaffected by this change.

---

## Architecture

`HabitGrid` keeps its existing `DndContext`, `orderedHabits` local state, and `useReorderHabits` mutation. Changes:

- Add: `groupByFrequency` pure function
- Add: `CATEGORY_ORDER` constant and `CATEGORY_LABELS` map
- Change: render one `<tbody>` + one `SortableContext` per non-empty category, instead of a single flat `<tbody>` + `SortableContext`
- Change: `handleDragEnd` gains a same-category guard

`HabitRow` is unchanged — still receives `habit` directly, still renders its own drag handle.

---

## Rendering Structure

One `<tbody>` per non-empty category, each containing:

1. A header `<tr>` with a single `<td colSpan={totalCols}>` showing the category label.
2. A `SortableContext` (scoped to that category's habit ids, `verticalListSortingStrategy`) wrapping one `<HabitRow>` per habit in the group.

Empty categories are omitted entirely.

Category order: **Diario → Semanal → Fin de semana → Mensual**

Within each group, habits appear in `orderedHabits` order (the existing local drag-state array), filtered down to that category — not re-sorted.

`totalCols = days.length + 2` (habit name column + total column), same as the existing header row.

---

## groupByFrequency

```ts
const CATEGORY_ORDER = ['daily', 'weekly', 'weekend', 'monthly'] as const
type Freq = typeof CATEGORY_ORDER[number]

const CATEGORY_LABELS: Record<Freq, string> = {
  daily:   'Diario',
  weekly:  'Semanal',
  weekend: 'Fin de semana',
  monthly: 'Mensual',
}

function groupByFrequency(habits: Habit[]) {
  return CATEGORY_ORDER
    .map(freq => ({ freq, habits: habits.filter(h => h.frequency === freq) }))
    .filter(g => g.habits.length > 0)
}
```

Applied to `orderedHabits` (the local drag-state copy), not the raw `habits` prop — so an in-flight drag re-groups instantly without waiting on the reorder mutation's refetch, matching how the existing flat list behaves today.

O(n×4). Returns only non-empty groups in fixed display order.

---

## Drag-and-drop: confined to category

`handleDragEnd` adds a same-category check before doing anything else:

```ts
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  if (!over || active.id === over.id) return
  const activeHabit = orderedHabits.find((h) => h.id === active.id)
  const overHabit = orderedHabits.find((h) => h.id === over.id)
  if (!activeHabit || !overHabit || activeHabit.frequency !== overHabit.frequency) return
  const fromIndex = orderedHabits.findIndex((h) => h.id === active.id)
  const toIndex = orderedHabits.findIndex((h) => h.id === over.id)
  const reordered = reorderHabits(orderedHabits, fromIndex, toIndex)
  setOrderedHabits(reordered)
  reorderMutation.mutate(reordered, {
    onError: () => setReorderError('No se pudo guardar el nuevo orden'),
  })
}
```

`fromIndex`/`toIndex` and the splice in `reorderHabits` still operate on the full flat `orderedHabits` array (unchanged from today), not a per-group sub-array. This is safe because:

- Every habit involved in a valid drag (post-guard) shares the same `frequency`.
- `reorderHabits`'s splice-and-reinsert preserves the relative order of all untouched items.
- Since rendering re-filters `orderedHabits` by category on every render, moving the dragged habit to sit at the target's flat-array position always produces the correct relative order *within that category* — regardless of how other-category habits are interleaved in the underlying flat array.

No change to `reorderHabits` (`lib/reorder.ts`) or `useReorderHabits` (`hooks/useHabits.ts`). The persisted `order` field's meaning shifts from "global display position" to "position within category in the grouped view" — no backend or data-model change needed, since nothing outside this grouped view currently depends on `order` meaning a strict global sequence.

**Cross-category drag attempt:** guard returns early, `orderedHabits` state is untouched, no mutation fires. dnd-kit's own drag-end animation returns the dragged row to its original slot — no error toast (this isn't a failure, it's a disallowed action, same tier as clicking outside a modal).

---

## Category Header Styling

```tsx
<tr>
  <td
    colSpan={totalCols}
    className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50"
  >
    {CATEGORY_LABELS[group.freq]}
  </td>
</tr>
```

Matches existing table palette. No per-category colors. No icons. No new CSS files.

---

## Edge Cases

- **All habits same frequency:** Single tbody with one header, all HabitRows beneath it, drag behaves exactly as it does today (everything is "same category").
- **No habits:** `HabitGrid` already handles empty `habits` prop — behavior unchanged.
- **Unknown frequency value:** Filtered out by `CATEGORY_ORDER.map(...)` — silently omitted. Not expected in practice: the habit-edit form's frequency field is a constrained select, not free text.
- **Drag across category boundary:** Rejected per above — no mutation, no persisted state change, row snaps back visually.

---

## What Does NOT Change

- `Tracker.tsx` — no changes
- `HabitRow.tsx` — no changes (frequency badge already implemented there)
- `useHabits.ts` — no changes (`useReorderHabits`, `reorderHabits` logic untouched)
- Firebase / backend — no changes
- Habit data model — no changes
