# Habit drag-to-reorder

## Problem

Habits render in creation order (`order` field, assigned sequentially on
create). The user wants to pick a custom order instead.

## Architecture

Backend already supports this: `Habit.order` (int) exists on the model,
`GET /api/habits` sorts by it, `PATCH /api/habits/{id}` accepts a new
`order`. No backend changes needed.

Frontend adds drag-and-drop reordering of rows in `HabitGrid`, backed by
`@dnd-kit/core` + `@dnd-kit/sortable` (new deps — no drag library currently
in the project). dnd-kit gives mouse, touch, and keyboard (arrow-key)
dragging for free, plus built-in ARIA roles for the sortable list.

## Components

- **`lib/reorder.ts`** (new) — pure helper, no DnD dependency:
  ```ts
  function reorderHabits(habits: Habit[], fromIndex: number, toIndex: number): Habit[]
  ```
  Moves the item and returns a new array in the new order. Unit-testable
  in isolation from any drag interaction.

- **`HabitGrid.tsx`** — wraps the `<tbody>` rows in dnd-kit's
  `DndContext` + `SortableContext` (vertical list strategy). On
  `onDragEnd`, calls `reorderHabits` for local optimistic state, then
  persists.

- **`HabitRow.tsx`** — adds a drag-handle icon (`DotsSixVertical` from
  phosphor-icons) next to the habit name, wired to dnd-kit's
  `useSortable` `listeners`/`attributes`. Only the handle is draggable —
  it sits alongside the existing edit/archive/delete icons, not
  replacing them.

- **`useHabits.ts`** — new `useReorderHabits()` mutation: takes the
  full reordered habit id list, PATCHes `order` (sequential 1..N) for
  every habit whose order actually changed, then invalidates the
  `habits` query. Runs the PATCHes in parallel (`Promise.all`).

## Data flow

1. User presses the grip on a row and drags it up/down.
2. dnd-kit reports intermediate positions; `HabitGrid` keeps a local
   `habits` array reordered live via `reorderHabits` so the UI tracks
   the drag (existing table rows re-render in place, no jump).
3. On drop, `HabitGrid` diffs the new order against the array from
   `useHabits()`, calls `useReorderHabits()` for the changed subset.
4. On success, `habits` query invalidates and refetches — server order
   now matches; local optimistic state is authoritative until then.

## Error handling

If a PATCH fails mid-reorder, invalidate the query anyway so the UI
reverts to the last known-good server order (existing habit list
becomes the source of truth again) and surface it via the existing
`Toast` pattern (`"No se pudo guardar el nuevo orden"`).

## Scope

Applies to the active-habit list in `Tracker` (`HabitGrid`) only.
`History` renders per-month summary cards, not a manipulable list — out
of scope.

## Testing

- `reorderHabits` — unit tests (move up, move down, move to start/end,
  no-op when fromIndex === toIndex).
- Manual browser verification of drag interaction (jsdom can't
  reliably simulate dnd-kit pointer sensors) — drag a row, confirm
  visual reorder, confirm it survives a page reload (i.e. persisted).
