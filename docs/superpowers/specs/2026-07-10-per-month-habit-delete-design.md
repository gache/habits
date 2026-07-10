# Per-month habit deletion

## Problem

Habits are a single global entity: one Firestore doc, shown in every
month from `created_at` forward. Deleting a habit (`DELETE
/api/habits/{id}`) hard-deletes that doc — the habit and its history
vanish from every month, past and future, not just the month the user
was looking at when they clicked delete.

Desired behavior: habits still auto-copy forward month to month (a
habit created in July keeps showing in August, September, ...) exactly
as today. But deleting a habit while viewing month Y should only
remove it from month Y — earlier and later months are untouched. Example
from the user: delete "Leer" while viewing July → July no longer shows
it, August still shows it normally.

Confirmed trade-off: there is no longer a way to permanently wipe a
habit from every month in one action. A mistakenly-created habit is
removed month-by-month. Habit docs are never hard-deleted by this flow
— `excluded_months` only grows. This was a deliberate simplification,
accepted over adding a second "permanent delete" action.

## Architecture

Add one field to the existing `Habit` doc: `excluded_months: list[str]`
(each entry a `"YYYY-MM"` string). No new collection, no per-month habit
copies — smallest change that satisfies the requirement, and keeps
streak/report code (which already reasons about habits as a single
timeline) working unmodified except for one new filter condition.

Considered and rejected:
- **Separate `habit_month_overrides` subcollection** — more
  "normalized," but adds a second collection, extra reads/writes, and
  more code for no behavior this app needs at its scale (a handful of
  habits per user).
- **Per-month habit copies** (distinct doc per month) — matches "add
  scoped to a month" literally, but breaks cross-month streak
  calculation (which relies on one `habit_id` having a continuous
  completion history) and requires copy-forward logic to run
  somewhere (cron, or lazy-copy on view). Significantly more complex
  for the same user-visible result.

## Backend changes

**`backend/models/habit.py`**
- `HabitOut` and the internal dict gain `excluded_months: list[str] = []`.

**`backend/routers/habits.py`** — `DELETE /api/habits/{habit_id}`
- New required query param: `month: str` (`"YYYY-MM"`).
- No longer deletes the habit doc. Instead:
  1. `ref.update({"excluded_months": firestore.ArrayUnion([month])})`.
  2. Delete completions for that habit within that month — same
     habit_id-only-filter-then-Python-range-check pattern already used
     in `list_completions`/`mark_complete` (avoids needing a composite
     index).
- Returns 204, same as before.

## Frontend changes

**`frontend/src/hooks/useHabits.ts`**
- `Habit` type gains `excluded_months: string[]`.
- `useDeleteHabit()` mutation input changes from `id: string` to
  `{ id: string; month: string }`; request becomes
  `api.delete(`/api/habits/${id}`, { params: { month } })`.

**`frontend/src/lib/report-utils.ts`**
- New export `visibleHabitsForMonth(habits, monthStr)` — filters out
  any habit with `monthStr` in its `excluded_months`. Doesn't touch
  `habitDaysElapsed`: an excluded habit is dropped from the list before
  any percentage math runs, so it contributes nothing to either side of
  a month's totals without needing a new parameter threaded through
  `date-utils.ts`.
- `monthlyGlobalPct` loops over `visibleHabitsForMonth(habits,
  monthStr)` instead of the raw `habits` array — this is the single
  point where exclusion affects percentage math, since it's the only
  place that sums across habits without a list already pre-filtered by
  a page component.

**Filtering habit lists per month** — every place that currently
decides which habits render for a given month filters through
`visibleHabitsForMonth` before rendering:
- `Tracker.tsx` — computes `visibleHabits` once, passes it to both
  `HabitGrid` and `WeeklyProgress` (both currently take a `habits` prop
  with no month-filtering of their own)
- `History.tsx` — `MonthCard` and `DetailPanel` each compute their own
  `visibleHabits` (they already have their own `monthStr`)
- `Report.tsx` — chained in front of the existing `habits.filter(...)`
  before mapping to `HabitReportCard`

**`HabitRow.tsx`**
- `handleDelete`'s toast-timeout callback changes from
  `deleteHabit.mutate(habit.id)` to
  `deleteHabit.mutate({ id: habit.id, month: monthStr })` (`monthStr`
  is already a prop).
- `ConfirmDialog` copy updates to describe month-scoped deletion
  instead of "permanentemente" (title: `"Eliminar hábito de este mes"`;
  message drops the permanence claim, keeps the existing undo-window
  wording).

**Cache invalidation** — after a successful delete, invalidate that
month's `['completions', month]` query (completions were deleted) and
the `habits` query (so `excluded_months` refreshes), same pattern
`useToggleCompletion` already follows.

## Data flow

1. User views July, clicks "Eliminar" on "Leer" → existing undo-toast
   flow (unchanged) → on timeout, `deleteHabit.mutate({ id, month:
   '2026-07' })`.
2. Backend adds `'2026-07'` to the habit's `excluded_months`, deletes
   its July completions.
3. Frontend invalidates `['completions', '2026-07']` and `['habits']`.
4. July's Tracker/History/Report views re-render without "Leer" and
   without it counting toward July's percentages. August (not in
   `excluded_months`) is untouched — same habit doc, same `habit_id`,
   still auto-copies forward as it always has.

## Error handling

Unchanged from today's delete flow: the undo toast is the safety net
before any network call happens. If the DELETE call itself fails after
the undo window closes, it surfaces through the existing mutation
error handling (no new error path needed).

## Testing

- **Backend** (`test_habits.py`, `test_completions.py`): deleting for
  month Y adds Y to `excluded_months` and removes only Y's completions
  for that habit — a completion in an adjacent month for the same
  habit survives.
- **Frontend unit**:
  - `report-utils.test.ts` — `visibleHabitsForMonth` drops a habit only
    for the month(s) in its `excluded_months`; `monthlyGlobalPct`
    excludes a habit's contribution for a month it was deleted from.
  - Filter logic in Tracker/History/Report — excluded-month habit does
    not appear in the rendered list/cards for that month, does appear
    for other months.
- **Frontend component**: `HabitRow.test.tsx` — delete mutation is
  called with `{ id, month }`, not a bare id string.
- **Manual browser verification**: delete a habit in one month, confirm
  it's gone from that month's Tracker/History/Report but still present
  (with its full prior history) in adjacent months.
