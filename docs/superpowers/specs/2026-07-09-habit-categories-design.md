# Habit Category System — Design Spec

**Date:** 2026-07-09  
**Scope:** `frontend/src/components/HabitGrid.tsx` only  
**Status:** Approved

---

## Summary

Auto-group habits in the tracker grid by their existing `frequency` field. Four categories in Spanish. No manual reordering. All changes confined to `HabitGrid.tsx`.

---

## Architecture

Remove DnD entirely from `HabitGrid`:

- Delete: `orderedHabits` local state
- Delete: `DndContext`, `SortableContext`, `DragOverlay`, `useSortable` usage
- Delete: all `@dnd-kit/core` and `@dnd-kit/sortable` imports
- Delete: `useReorderHabits` import and call
- Add: `groupByFrequency` pure function
- Add: `CATEGORY_ORDER` constant and `CATEGORY_LABELS` map

`HabitRow` receives `habit` directly (no sortable wrapper). `useReorderHabits` hook remains in `useHabits.ts` — it's just no longer called.

---

## Rendering Structure

One `<tbody>` per non-empty category. Each tbody contains:

1. A header `<tr>` with a single `<td colSpan={totalCols}>` showing the category label.
2. One `<HabitRow>` per habit in that group.

Empty categories are omitted entirely.

Category order: **Diario → Semanal → Fin de semana → Mensual**

Within each group, habits appear in original API order (no secondary sorting).

`totalCols = daysInMonth + 2` (habit name column + streak column), derived from the existing `days` array already in scope.

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

O(n×4). Returns only non-empty groups in fixed display order.

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

- **All habits same frequency:** Single tbody with one header, all HabitRows beneath it.
- **No habits:** `HabitGrid` already handles empty `habits` prop — behavior unchanged.
- **Unknown frequency value:** Filtered out by `CATEGORY_ORDER.map(...)` — silently omitted.

---

## What Does NOT Change

- `Tracker.tsx` — no changes
- `HabitRow.tsx` — no changes
- `useHabits.ts` — no changes (`useReorderHabits` stays, just unused by HabitGrid)
- Firebase / backend — no changes
- Habit data model — no changes
