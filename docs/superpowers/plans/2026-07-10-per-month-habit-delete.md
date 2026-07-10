# Per-Month Habit Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deleting a habit while viewing month Y removes it (and its completions) only from month Y — earlier and later months keep the habit and its history, exactly as before.

**Architecture:** Add `excluded_months: string[]` to the existing `Habit` Firestore doc. `DELETE /api/habits/{id}` stops hard-deleting the doc — instead it appends the target month to `excluded_months` and deletes only that month's completions for the habit. Every frontend list that decides which habits render for a given month filters through a new shared helper, `visibleHabitsForMonth`.

**Tech Stack:** FastAPI + Firestore (backend), React + TanStack Query + Vitest (frontend). No new dependencies.

## Global Constraints

- No new Firestore collection — `excluded_months` lives on the existing habit doc (spec: "Architecture").
- The habit doc is never hard-deleted by this flow; `excluded_months` only grows. There is deliberately no separate "permanent delete" action (spec: "Problem", confirmed trade-off).
- UI copy must not claim the deletion is permanent (spec: "Frontend changes — HabitRow.tsx").
- `DELETE /api/habits/{habit_id}` requires a `month` query param (`"YYYY-MM"`) — this is a breaking change to the existing endpoint contract, not additive.

---

### Task 1: Backend — `excluded_months` field and month-scoped delete

**Files:**
- Modify: `backend/models/habit.py`
- Modify: `backend/routers/habits.py`
- Test: `backend/tests/test_habits.py`

**Interfaces:**
- Produces: `HabitOut.excluded_months: list[str]` (always present, defaults to `[]`). `DELETE /api/habits/{habit_id}?month=YYYY-MM` — 204 on success, 404 if the habit doesn't exist, 422 if `month` is missing.

- [ ] **Step 1: Write the failing tests**

Open `backend/tests/test_habits.py`. Replace the existing `test_deleting_all_habits_does_not_reseed_defaults` (it asserted hard-delete semantics that no longer exist) and `test_delete_missing_habit_404s` (it's missing the now-required `month` param), and add three new tests:

```python
def test_deleting_all_habits_excludes_from_month_but_keeps_docs(client):
    all_habits = client.get("/api/habits").json()
    for h in all_habits:
        r = client.delete(f"/api/habits/{h['id']}", params={"month": "2026-07"})
        assert r.status_code == 204

    r = client.get("/api/habits")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 16
    assert all("2026-07" in h["excluded_months"] for h in data)


def test_update_missing_habit_404s(client):
    r = client.patch("/api/habits/does-not-exist", json={"name": "x"})
    assert r.status_code == 404


def test_delete_missing_habit_404s(client):
    r = client.delete("/api/habits/does-not-exist", params={"month": "2026-07"})
    assert r.status_code == 404


def test_delete_only_excludes_target_month(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    r = client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    assert r.status_code == 204
    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == ["2026-07"]


def test_delete_removes_only_that_months_completions(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-06-30"})
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-01"})

    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})

    july = client.get("/api/completions", params={"month": "2026-07"}).json()
    june = client.get("/api/completions", params={"month": "2026-06"}).json()
    assert july == []
    assert [c["date"] for c in june] == ["2026-06-30"]


def test_delete_twice_same_month_does_not_duplicate_exclusion(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == ["2026-07"]
```

`test_update_missing_habit_404s` is unchanged — reproduced above only so the file's full new content is unambiguous; keep it where it already is if your editor diff shows it as a no-op.

The full file, in final order, should read:

```python
def test_new_habit_appends_order_instead_of_zero(client):
    r = client.post("/api/habits", json={"name": "First"})
    assert r.status_code == 201
    assert r.json()["order"] == 1


def test_second_habit_appends_after_the_first(client):
    client.post("/api/habits", json={"name": "First"})
    r = client.post("/api/habits", json={"name": "Second"})
    assert r.json()["order"] == 2


def test_explicit_order_is_respected(client):
    r = client.post("/api/habits", json={"name": "Custom", "order": 5})
    assert r.json()["order"] == 5


def test_list_habits_seeds_defaults_on_first_visit(client):
    r = client.get("/api/habits")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 16
    assert [h["order"] for h in data] == sorted(h["order"] for h in data)


def test_active_filter_splits_seeded_habits(client):
    all_habits = client.get("/api/habits").json()
    first_id = all_habits[0]["id"]
    client.patch(f"/api/habits/{first_id}", json={"active": False})

    active = client.get("/api/habits", params={"active": True}).json()
    inactive = client.get("/api/habits", params={"active": False}).json()
    assert len(active) == 15
    assert len(inactive) == 1
    assert inactive[0]["id"] == first_id


def test_deleting_all_habits_excludes_from_month_but_keeps_docs(client):
    all_habits = client.get("/api/habits").json()
    for h in all_habits:
        r = client.delete(f"/api/habits/{h['id']}", params={"month": "2026-07"})
        assert r.status_code == 204

    r = client.get("/api/habits")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 16
    assert all("2026-07" in h["excluded_months"] for h in data)


def test_update_missing_habit_404s(client):
    r = client.patch("/api/habits/does-not-exist", json={"name": "x"})
    assert r.status_code == 404


def test_delete_missing_habit_404s(client):
    r = client.delete("/api/habits/does-not-exist", params={"month": "2026-07"})
    assert r.status_code == 404


def test_delete_only_excludes_target_month(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    r = client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    assert r.status_code == 204
    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == ["2026-07"]


def test_delete_removes_only_that_months_completions(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-06-30"})
    client.post(f"/api/habits/{habit['id']}/complete", json={"date": "2026-07-01"})

    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})

    july = client.get("/api/completions", params={"month": "2026-07"}).json()
    june = client.get("/api/completions", params={"month": "2026-06"}).json()
    assert july == []
    assert [c["date"] for c in june] == ["2026-06-30"]


def test_delete_twice_same_month_does_not_duplicate_exclusion(client):
    habit = client.post("/api/habits", json={"name": "Leer"}).json()
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    client.delete(f"/api/habits/{habit['id']}", params={"month": "2026-07"})
    updated = client.get(f"/api/habits/{habit['id']}").json()
    assert updated["excluded_months"] == ["2026-07"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/erickfranco/habits && python -m pytest backend/tests/test_habits.py -v`
Expected: `test_deleting_all_habits_excludes_from_month_but_keeps_docs` FAILs (422, `month` not accepted yet), `test_delete_missing_habit_404s` FAILs (422 instead of 404), `test_delete_only_excludes_target_month` / `test_delete_removes_only_that_months_completions` / `test_delete_twice_same_month_does_not_duplicate_exclusion` FAIL (422).

- [ ] **Step 3: Add `excluded_months` to `HabitOut`**

In `backend/models/habit.py`, add one field to `HabitOut` (leave `HabitCreate`/`HabitUpdate` untouched — exclusion is only ever set by the delete endpoint):

```python
class HabitOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    frequency: str
    active: bool
    icon: str
    color: str
    order: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    excluded_months: list[str] = Field(default_factory=list)
```

- [ ] **Step 4: Rewrite `delete_habit` and update `_doc_to_habit`**

In `backend/routers/habits.py`:

1. Add `Query` to the fastapi import:

```python
from fastapi import APIRouter, Depends, HTTPException, Query
```

2. In `_doc_to_habit`, add `excluded_months` to the returned `HabitOut`:

```python
def _doc_to_habit(doc) -> HabitOut:
    d = doc.to_dict()
    return HabitOut(
        id=doc.id,
        name=d["name"],
        description=d.get("description"),
        frequency=d.get("frequency", "daily"),
        active=d.get("active", True),
        icon=d.get("icon", "⭐"),
        color=d.get("color", "#d4c4a8"),
        order=d.get("order", 0),
        created_at=d.get("created_at"),
        updated_at=d.get("updated_at"),
        excluded_months=d.get("excluded_months", []),
    )
```

3. Replace `delete_habit` entirely:

```python
@router.delete("/{habit_id}", status_code=204)
def delete_habit(
    habit_id: str,
    month: str = Query(..., description="YYYY-MM"),
    uid: str = Depends(get_current_uid),
):
    db = get_db()
    ref = db.collection("users").document(uid).collection("habits").document(habit_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Habit not found")

    excluded_months = doc.to_dict().get("excluded_months", [])
    if month not in excluded_months:
        ref.update({"excluded_months": excluded_months + [month]})

    # Filter by habit_id only in Firestore (same index-avoidance pattern as
    # completions.list_completions) and check the date range in Python.
    start = f"{month}-01"
    end = f"{month}-32"
    completions_ref = db.collection("users").document(uid).collection("completions")
    habit_completions = completions_ref.where("habit_id", "==", habit_id).get()
    for c in habit_completions:
        if start <= c.to_dict()["date"] <= end:
            c.reference.delete()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/erickfranco/habits && python -m pytest backend/tests/test_habits.py backend/tests/test_completions.py -v`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/models/habit.py backend/routers/habits.py backend/tests/test_habits.py
git commit -m "feat: scope habit deletion to a single month"
```

---

### Task 2: Frontend pure logic — Habit type, `useDeleteHabit`, `visibleHabitsForMonth`

**Files:**
- Modify: `frontend/src/hooks/useHabits.ts`
- Modify: `frontend/src/lib/report-utils.ts`
- Test: `frontend/src/hooks/__tests__/useHabits.test.tsx`
- Test: `frontend/src/lib/__tests__/report-utils.test.ts`

**Interfaces:**
- Consumes: `Habit` (from Task 1's `HabitOut` shape, now including `excluded_months`).
- Produces: `Habit.excluded_months?: string[]`. `useDeleteHabit()` mutation now takes `{ id: string; month: string }` instead of `string`. `visibleHabitsForMonth(habits: Habit[], monthStr: string): Habit[]` (new export from `report-utils.ts`). `monthlyGlobalPct` now excludes a habit's contribution for any month in its `excluded_months`.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/hooks/__tests__/useHabits.test.tsx`, replace the existing delete test:

```ts
  it('deletes a habit via DELETE', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: wrapper() })
    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/habits/1')
  })
```

with:

```ts
  it('deletes a habit for one month via DELETE', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: wrapper() })
    result.current.mutate({ id: '1', month: '2026-07' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/habits/1', { params: { month: '2026-07' } })
  })
```

In `frontend/src/lib/__tests__/report-utils.test.ts`, add a new `describe` block (place it after the `monthlyGlobalPct` block) and one new test inside the existing `monthlyGlobalPct` block:

```ts
describe('visibleHabitsForMonth', () => {
  it('keeps a habit with no excluded_months', () => {
    const habit = makeHabit({ excluded_months: [] })
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([habit])
  })

  it('keeps a habit with excluded_months left undefined', () => {
    const habit = makeHabit()
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([habit])
  })

  it('drops a habit excluded from the given month', () => {
    const habit = makeHabit({ excluded_months: ['2026-07'] })
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([])
  })

  it('keeps a habit excluded from a different month', () => {
    const habit = makeHabit({ excluded_months: ['2026-06'] })
    expect(visibleHabitsForMonth([habit], '2026-07')).toEqual([habit])
  })
})
```

Add this test inside the existing `describe('monthlyGlobalPct', ...)` block, after `it('counts backfilled completions from before the habit's created_at month', ...)`:

```ts
  it("excludes a habit's contribution for a month it was deleted from", () => {
    const habit = makeHabit({ frequency: 'daily', excluded_months: ['2026-06'] })
    const completions = Array.from({ length: 30 }, (_, i) =>
      makeCompletion('h1', `2026-06-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-06')).toBeNull()
  })
```

Update the import line at the top of `report-utils.test.ts` to also pull in `visibleHabitsForMonth`:

```ts
import { monthlyGlobalPct, missedPeriods, weekdayPattern, visibleHabitsForMonth } from '../report-utils'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/erickfranco/habits/frontend && npx vitest run src/hooks/__tests__/useHabits.test.tsx src/lib/__tests__/report-utils.test.ts`
Expected: FAIL — `useDeleteHabit` test fails on the call signature; `visibleHabitsForMonth` tests fail with "visibleHabitsForMonth is not a function"; the new `monthlyGlobalPct` test fails (returns `100`, not `null`, since exclusion isn't wired up yet).

- [ ] **Step 3: Add `excluded_months` to `Habit` and update `useDeleteHabit`**

In `frontend/src/hooks/useHabits.ts`:

```ts
export interface Habit {
  id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'weekend'
  active: boolean
  icon: string
  color: string
  order: number
  created_at: string | null
  updated_at: string | null
  excluded_months?: string[]
}
```

Replace `useDeleteHabit`:

```ts
export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; month: string }>({
    mutationFn: async ({ id, month }) => {
      await api.delete(`/api/habits/${id}`, { params: { month } })
    },
    onSuccess: (_data, { month }) => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['completions', month] })
    },
  })
}
```

- [ ] **Step 4: Add `visibleHabitsForMonth` and wire it into `monthlyGlobalPct`**

In `frontend/src/lib/report-utils.ts`, add this export (placed after `lastReportableDay`, before `monthlyGlobalPct`):

```ts
/**
 * Habits that should be visible for `monthStr` — everything except habits
 * explicitly excluded from that specific month via a month-scoped delete.
 * Doesn't consider `created_at`; callers that also need to hide
 * not-yet-created habits apply that separately.
 */
export function visibleHabitsForMonth(habits: Habit[], monthStr: string): Habit[] {
  return habits.filter((h) => !h.excluded_months?.includes(monthStr))
}
```

Change `monthlyGlobalPct`'s loop from `for (const h of habits) {` to:

```ts
  for (const h of visibleHabitsForMonth(habits, monthStr)) {
```

(the rest of the function body is unchanged).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/erickfranco/habits/frontend && npx vitest run src/hooks/__tests__/useHabits.test.tsx src/lib/__tests__/report-utils.test.ts`
Expected: all PASS.

- [ ] **Step 6: Typecheck**

Run: `cd /Users/erickfranco/habits/frontend && npx tsc --noEmit -p .`
Expected: `TypeScript: No errors found`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useHabits.ts frontend/src/lib/report-utils.ts frontend/src/hooks/__tests__/useHabits.test.tsx frontend/src/lib/__tests__/report-utils.test.ts
git commit -m "feat: add excluded_months to Habit and visibleHabitsForMonth helper"
```

---

### Task 3: Frontend UI wiring — Tracker, History, Report, HabitRow

**Files:**
- Modify: `frontend/src/pages/Tracker.tsx`
- Modify: `frontend/src/pages/History.tsx`
- Modify: `frontend/src/pages/Report.tsx`
- Modify: `frontend/src/components/HabitRow.tsx`
- Test: `frontend/src/components/__tests__/HabitRow.test.tsx`
- Test: `frontend/src/pages/__tests__/Report.test.tsx`

**Interfaces:**
- Consumes: `visibleHabitsForMonth` and `useDeleteHabit` from Task 2.
- Produces: no new exports — this task is wiring, verified by rendering behavior.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/components/__tests__/HabitRow.test.tsx`, add this test at the end of the `describe('HabitRow', ...)` block, after `'cancelling the delete confirmation...'`:

```ts
  it('deletes the habit for the current month after the undo window expires', async () => {
    vi.useFakeTimers()
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })
    renderRow(makeHabit())
    fireEvent.click(screen.getByLabelText('Eliminar Leer'))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.delete).toHaveBeenCalledWith('/api/habits/h1', { params: { month: '2026-07' } })
  })
```

In `frontend/src/pages/__tests__/Report.test.tsx`, add this test at the end of the `describe('Report', ...)` block:

```ts
  it('does not render a card for a habit excluded from the selected month', async () => {
    const excludedHabit: Habit = { ...HABIT, id: 'h2', name: 'Excluido', excluded_months: ['2026-07'] }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [HABIT, excludedHabit] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
    expect(screen.queryByText(/Excluido/)).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/erickfranco/habits/frontend && npx vitest run src/components/__tests__/HabitRow.test.tsx src/pages/__tests__/Report.test.tsx`
Expected: FAIL — `HabitRow`'s new test fails (`api.delete` called with just `'/api/habits/h1'`, no params); `Report`'s new test fails ("Excluido" still renders, since Report.tsx doesn't filter by `excluded_months` yet).

- [ ] **Step 3: Wire `HabitRow.tsx`'s delete call and update copy**

In `frontend/src/components/HabitRow.tsx`, change the toast timeout callback:

```tsx
      <Toast
        message={`"${habit.name}" eliminado`}
        actionLabel="Deshacer"
        onAction={() => setDeleting(false)}
        onTimeout={() => deleteHabit.mutate({ id: habit.id, month: monthStr })}
      />
```

Change the trash button's hover title (desktop overlay) from claiming permanence:

```tsx
            <button
              onClick={() => setConfirmingDelete(true)}
              className="p-0.5 rounded text-cream-600 dark:text-cream-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
              title="Eliminar hábito de este mes"
              aria-label={`Eliminar ${habit.name}`}
            >
              <Trash size={14} />
            </button>
```

Update the confirm dialog message to name the month scope:

```tsx
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
```

- [ ] **Step 4: Filter habits by month in `Tracker.tsx`**

In `frontend/src/pages/Tracker.tsx`, add `visibleHabitsForMonth` to the report-utils import:

```ts
import { monthlyGlobalPct, visibleHabitsForMonth } from '@/lib/report-utils'
```

Right after the `useHabits` line (`const { data: habits = [], isLoading: habitsLoading, isError: habitsError } = useHabits(true)`), add:

```ts
  const visibleHabits = visibleHabitsForMonth(habits, monthStr)
```

Change the `HabitGrid` and `WeeklyProgress` props from `habits={habits}` to `habits={visibleHabits}`:

```tsx
            <HabitGrid
              habits={visibleHabits}
              year={year}
              month={month}
              completions={completions}
              streakCompletions={streakCompletions}
              isError={habitsError}
              onToggle={toggle}
            />
          )}
          <WeeklyProgress year={year} month={month} completions={completions} habits={visibleHabits} />
```

(Leave the `monthlyGlobalPct(habits, completions, monthStr)` call for the header badge using the raw `habits` — `monthlyGlobalPct` now filters internally via `visibleHabitsForMonth` itself, from Task 2.)

- [ ] **Step 5: Filter habits by month in `History.tsx`**

In `frontend/src/pages/History.tsx`, add the import:

```ts
import { visibleHabitsForMonth } from '@/lib/report-utils'
```

In `MonthCard`, right after `const monthStr = `${year}-${pad(month)}`` (top of the function), add:

```ts
  const visibleHabits = visibleHabitsForMonth(habits, monthStr)
```

Change the totals loop from `for (const h of habits) {` to `for (const h of visibleHabits) {`, and change the mini-bar map from `{habits.map((h) => {` to `{visibleHabits.map((h) => {`.

In `DetailPanel`, right after `const monthStr = `${year}-${pad(month)}`` (top of the function), add:

```ts
  const visibleHabits = visibleHabitsForMonth(habits, monthStr)
```

Change the table body map from `{habits.map((habit) => {` to `{visibleHabits.map((habit) => {`.

- [ ] **Step 6: Filter habits by month in `Report.tsx`**

In `frontend/src/pages/Report.tsx`, add `visibleHabitsForMonth` to the report-utils import:

```ts
import { monthlyGlobalPct, visibleHabitsForMonth } from '@/lib/report-utils'
```

Change the habits list before the existing `.filter(...).map(...)` chain from:

```tsx
          habits
            .filter(
              (habit) =>
                !habit.created_at ||
                habit.created_at.slice(0, 7) <= monthStr ||
                trendCompletions.some((c) => c.habit_id === habit.id && c.date.startsWith(monthStr)),
            )
            .map((habit) => (
```

to:

```tsx
          visibleHabitsForMonth(habits, monthStr)
            .filter(
              (habit) =>
                !habit.created_at ||
                habit.created_at.slice(0, 7) <= monthStr ||
                trendCompletions.some((c) => c.habit_id === habit.id && c.date.startsWith(monthStr)),
            )
            .map((habit) => (
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /Users/erickfranco/habits/frontend && npx vitest run`
Expected: all PASS.

- [ ] **Step 8: Typecheck, lint, build**

Run: `cd /Users/erickfranco/habits/frontend && npx tsc --noEmit -p . && npm run lint && npm run build`
Expected: no type errors, no lint errors, build succeeds.

- [ ] **Step 9: Manual browser verification**

With the backend (`uvicorn backend.main:app --port 8000`) and frontend (`npm run dev`) both running:

1. Open the Tracker on the current month, note an existing habit's name (e.g. "Leer").
2. Click the trash icon on that habit, confirm the dialog now reads "de este mes" — confirm the delete.
3. Wait ~5s for the undo toast to expire (or let it run its course without clicking "Deshacer").
4. Confirm the habit disappears from the current month's Tracker grid.
5. Navigate to the previous month (Tracker's "Mes anterior") — confirm the same habit still appears there, with its prior completions intact.
6. Navigate to next month (back to where you deleted it, then one month past that) — confirm the habit reappears in the month *after* the one you deleted it in (auto-copy-forward is untouched).
7. Open Informe (`/informe`) for the month you deleted it in — confirm no card for that habit, and the trend/global % for that month no longer counts it.
8. Open Historial (`/history`) — confirm the month you deleted it in shows no row/mini-bar for that habit in both the month-card list and the detail panel, while adjacent months do.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/Tracker.tsx frontend/src/pages/History.tsx frontend/src/pages/Report.tsx frontend/src/components/HabitRow.tsx frontend/src/components/__tests__/HabitRow.test.tsx frontend/src/pages/__tests__/Report.test.tsx
git commit -m "feat: hide month-excluded habits across Tracker, History, and Report"
```
