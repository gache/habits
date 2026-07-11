# Frequency Label Unification + TrendChart Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify frequency label wording to one source of truth across the app, and fix `TrendChart`'s hardcoded colors so it respects dark mode.

**Architecture:** Two independent, single-concern tasks. Task 1 changes `FREQUENCY_LABELS`' values in `frontend/src/lib/habit-presets.ts` (the app's existing single source of truth for frequency display text, already consumed by `HabitRow.tsx`, `HabitReportCard.tsx`, `AddHabitModal.tsx`) and deletes `HabitGrid.tsx`'s duplicate `CATEGORY_LABELS` map in favor of importing `FREQUENCY_LABELS`. Task 2 introduces CSS custom properties (`--chart-grid`, `--chart-tick`, `--chart-line`, `--chart-tooltip-bg`, `--chart-tooltip-text`, `--chart-tooltip-border`) in `frontend/src/index.css`, themed via the existing `.dark` class selector, and swaps `TrendChart.tsx`'s hardcoded hex color props for `var(--chart-*)` references.

**Tech Stack:** React, TypeScript, Tailwind CSS (`darkMode: 'class'`), Vitest + React Testing Library, recharts.

## Global Constraints

- Task 1 scope: `frontend/src/lib/habit-presets.ts`, `frontend/src/components/HabitGrid.tsx` only.
- Task 2 scope: `frontend/src/index.css`, `frontend/src/components/TrendChart.tsx` only.
- Final `FREQUENCY_LABELS` values: `{ daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', weekend: 'Fin de semana' }` — `weekly`/`monthly` are unchanged, only `daily` and `weekend` change wording.
- `CATEGORY_ORDER` (`['daily', 'weekly', 'weekend', 'monthly'] as const`) stays in `HabitGrid.tsx` — it is not a labeling concern, do not move or remove it.
- No backend, data-model, or routing changes in either task.
- Task 2 is a visual-only fix (colors, not behavior) — no new test assertions target chart colors; verification is manual/visual in both light and dark mode.

---

### Task 1: Unify frequency labels

**Files:**
- Modify: `frontend/src/lib/habit-presets.ts`
- Modify: `frontend/src/components/HabitGrid.tsx`
- Test: `frontend/src/components/__tests__/HabitGrid.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `FREQUENCY_LABELS` (unchanged export name/shape, new values) continues to be consumed by `HabitRow.tsx`, `HabitReportCard.tsx`, `AddHabitModal.tsx` (no changes needed in those three files — they already import `FREQUENCY_LABELS` by reference, so the new values flow through automatically). `HabitGrid.tsx` no longer exports `CATEGORY_LABELS` — if anything outside this task imported it, that would be a compile error surfaced by `tsc -b` in Step 4 below.

- [ ] **Step 1: Confirm no other file imports `CATEGORY_LABELS`**

Run: `cd frontend && grep -rn "CATEGORY_LABELS" src --include="*.tsx" --include="*.ts"`
Expected: only the two matches inside `HabitGrid.tsx` itself (the `export const` declaration and its one usage in JSX). If any other file matches, stop and report BLOCKED — the removal in Step 3 would break that file.

- [ ] **Step 2: Change `FREQUENCY_LABELS` values**

In `frontend/src/lib/habit-presets.ts`, replace:

```ts
export const FREQUENCY_LABELS: Record<'daily' | 'weekly' | 'monthly' | 'weekend', string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
  weekend: 'Fin de Semana',
}
```

with:

```ts
export const FREQUENCY_LABELS: Record<'daily' | 'weekly' | 'monthly' | 'weekend', string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  weekend: 'Fin de semana',
}
```

- [ ] **Step 3: Remove `CATEGORY_LABELS` from `HabitGrid.tsx`, import `FREQUENCY_LABELS` instead**

In `frontend/src/components/HabitGrid.tsx`, change the import line:

```ts
import { type Habit, useReorderHabits } from '@/hooks/useHabits'
```

to:

```ts
import { type Habit, useReorderHabits } from '@/hooks/useHabits'
import { FREQUENCY_LABELS } from '@/lib/habit-presets'
```

Delete this block entirely:

```ts
export const CATEGORY_LABELS: Record<Freq, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  weekend: 'Fin de semana',
  monthly: 'Mensual',
}
```

Find the one JSX usage (search for `CATEGORY_LABELS[group.freq]`) and replace it with:

```tsx
{FREQUENCY_LABELS[group.freq]}
```

The `Freq` type alias (`type Freq = typeof CATEGORY_ORDER[number]`) stays — it's still used as `groupByFrequency`'s return type and now also matches `FREQUENCY_LABELS`' key type structurally (both are the same four string literals), so `FREQUENCY_LABELS[group.freq]` type-checks without changes.

- [ ] **Step 4: Typecheck and run the full HabitGrid test file**

Run: `cd frontend && npx tsc -b && npx vitest run src/components/__tests__/HabitGrid.test.tsx`
Expected: `tsc -b` reports no errors (confirms Step 1's grep was complete — a stray `CATEGORY_LABELS` import elsewhere would fail here). All tests in `HabitGrid.test.tsx` pass — the existing category-header-text assertions (`Diario`, `Semanal`, `Fin de semana`, `Mensual`, scoped via `{ selector: 'td.bg-gray-50' }`) keep passing unchanged, since those are exactly the values `FREQUENCY_LABELS` now holds.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — all test files, including `HabitRow.test.tsx`, `HabitReportCard.test.tsx`, `AddHabitModal.test.tsx` (none of which assert on frequency label text today, confirmed by `grep -rn "Diaria\|Fin de Semana" src --include="*.test.tsx"` returning no matches — so none of them break from the wording change).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/habit-presets.ts frontend/src/components/HabitGrid.tsx
git commit -m "fix: unify frequency label wording to one source of truth"
```

---

### Task 2: TrendChart dark mode

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/TrendChart.tsx`

**Interfaces:**
- Consumes: the existing `.dark` class on `document.documentElement`, toggled by `Tracker.tsx` (`frontend/src/pages/Tracker.tsx:33`, `document.documentElement.classList.toggle('dark', on)`) — already present, not modified by this task.
- Produces: no new exports; this is a self-contained visual fix.

- [ ] **Step 1: Add chart CSS custom properties**

In `frontend/src/index.css`, add (placement: anywhere at top level, e.g. right before the existing `.dark .grid-scroll` rule — search for that selector to find a natural insertion point):

```css
:root {
  --chart-grid: #e5dcc8;
  --chart-tick: #8a7550;
  --chart-line: #457040;
  --chart-tooltip-bg: #faf7f2;
  --chart-tooltip-text: #3d3020;
  --chart-tooltip-border: #d4c4a8;
}
.dark {
  --chart-grid: #6b5a45;
  --chart-tick: #d4c4a8;
  --chart-line: #7ba873;
  --chart-tooltip-bg: #3d3020;
  --chart-tooltip-text: #f5f0e8;
  --chart-tooltip-border: #6b5a45;
}
```

- [ ] **Step 2: Swap hardcoded colors in `TrendChart.tsx` for `var(--chart-*)`**

In `frontend/src/components/TrendChart.tsx`, replace:

```tsx
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dcc8" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8a7550' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8a7550' }} />
            <Tooltip formatter={(value) => [`${value}%`, 'Completado']} />
            <Line type="monotone" dataKey="pct" stroke="#457040" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
```

with:

```tsx
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--chart-tick)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--chart-tick)' }} />
            <Tooltip
              formatter={(value) => [`${value}%`, 'Completado']}
              contentStyle={{
                backgroundColor: 'var(--chart-tooltip-bg)',
                color: 'var(--chart-tooltip-text)',
                border: '1px solid var(--chart-tooltip-border)',
              }}
            />
            <Line type="monotone" dataKey="pct" stroke="var(--chart-line)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
```

- [ ] **Step 3: Run the TrendChart test file**

Run: `cd frontend && npx vitest run src/components/__tests__/TrendChart.test.tsx`
Expected: PASS — these tests assert on the `sr-only` text-alternative list and heading text, not chart colors, so they're unaffected by this change.

- [ ] **Step 4: Typecheck and build**

Run: `cd frontend && npm run build`
Expected: PASS — `tsc -b` clean (the `contentStyle` object is a plain `React.CSSProperties`-compatible object, no type changes needed), `vite build` succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/components/TrendChart.tsx
git commit -m "fix: theme TrendChart colors for dark mode"
```

---

### Task 3: Manual visual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend test suite one more time**

Run: `cd frontend && npm test`
Expected: PASS — all tests, confirming Task 1 and Task 2 together haven't broken anything.

- [ ] **Step 2: Manual check in the running app**

Start the app (backend `./run-dev.sh`, frontend `npm run dev`). Open the tracker page:
- Confirm the category header wording ("Diario", "Fin de semana") now visually matches the per-habit badge wording underneath each row (no more "Diario" header over a "Diaria" badge).
- Open the add-habit modal, confirm the frequency dropdown still reads "Diario"/"Semanal"/"Mensual"/"Fin de semana" (all four options render, none blank).
- Go to the Informe (Report) page, confirm the trend chart renders normally in light mode (grid lines, axis labels, green line all visible, matching the pre-change look).
- Toggle dark mode (moon icon on the tracker page), navigate to Informe again: confirm the trend chart's grid lines, axis tick labels, and line are legible against the dark background, and hovering a point on the line shows a dark-themed tooltip box (not a jarring white box).

No code changes in this step — it's a manual confirmation before considering the work done.
