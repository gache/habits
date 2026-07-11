# Frequency Label Unification + TrendChart Dark Mode — Design Spec

**Date:** 2026-07-11
**Scope:** `frontend/src/lib/habit-presets.ts`, `frontend/src/components/HabitGrid.tsx`, `frontend/src/components/TrendChart.tsx`, `frontend/src/index.css`
**Status:** Approved

---

## Summary

Two small, independent polish fixes bundled into one session:

1. **Frequency label wording is inconsistent** across the app — the tracker grid's category headers say "Diario"/"Fin de semana" while the per-habit badge (`HabitRow`, `HabitReportCard`) and the add-habit dropdown say "Diaria"/"Fin de Semana". Unify on the short form and eliminate the duplicate label map.
2. **`TrendChart` ignores dark mode** — its grid lines, axis ticks, trend line, and tooltip are hardcoded hex colors (and recharts' default white tooltip box), so they look wrong (or in the tooltip's case, jarring) when the app is in dark mode, unlike every other themed surface in the app.

---

## Fix 1: Unify frequency labels

### Current state

`FREQUENCY_LABELS` in `frontend/src/lib/habit-presets.ts` is the single source of truth already consumed by `HabitRow.tsx`, `HabitReportCard.tsx`, and `AddHabitModal.tsx`'s frequency `<select>`:

```ts
export const FREQUENCY_LABELS: Record<'daily' | 'weekly' | 'monthly' | 'weekend', string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
  weekend: 'Fin de Semana',
}
```

`HabitGrid.tsx` (added in the previous session, category-grouping feature) has its own separate, differently-worded map:

```ts
export const CATEGORY_LABELS: Record<Freq, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  weekend: 'Fin de semana',
  monthly: 'Mensual',
}
```

### Change

Update `FREQUENCY_LABELS` values to the short form (`weekly`/`monthly` are already correct and unchanged):

```ts
export const FREQUENCY_LABELS: Record<'daily' | 'weekly' | 'monthly' | 'weekend', string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  weekend: 'Fin de semana',
}
```

Remove `CATEGORY_LABELS` from `HabitGrid.tsx` entirely. Import `FREQUENCY_LABELS` from `@/lib/habit-presets` instead and use it wherever `CATEGORY_LABELS[group.freq]` was used. `CATEGORY_ORDER` (the fixed grouping order) stays in `HabitGrid.tsx` — it's grid-specific, not a labeling concern.

### Effect

Every consumer (tracker grid category header, per-habit badge in the grid and in the report, add-habit dropdown) now renders identical wording for a given frequency, and there's exactly one place (`habit-presets.ts`) that owns the text.

### What does NOT change

- `CATEGORY_ORDER`, `groupByFrequency`, `resolveDragReorder` in `HabitGrid.tsx` — untouched.
- No backend/data-model change — this is display text only, `Habit.frequency` values (`'daily' | 'weekly' | 'monthly' | 'weekend'`) are unaffected.

---

## Fix 2: TrendChart dark mode

### Current state

`frontend/src/components/TrendChart.tsx` passes hardcoded hex colors directly to recharts SVG props, which don't respond to the app's `.dark` class (Tailwind `darkMode: 'class'`, toggled by `Tracker.tsx` via `document.documentElement.classList.toggle('dark', on)`):

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="#e5dcc8" />
<XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8a7550' }} />
<YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8a7550' }} />
<Tooltip formatter={(value) => [`${value}%`, 'Completado']} />
<Line type="monotone" dataKey="pct" stroke="#457040" strokeWidth={2} dot={{ r: 3 }} />
```

The `Tooltip` has no `contentStyle`, so it falls back to recharts' default white box with black text — visibly wrong against a dark page.

### Why CSS custom properties, not JS state

`TrendChart` (and its parent, `Report.tsx`) has no access to dark-mode state today — it's local `useState` inside `Tracker.tsx`, applied only as a class on `document.documentElement`. Threading that boolean down through `Report.tsx` → `TrendChart.tsx` would mean either lifting dark-mode state to a shared place (app-wide context) or prop-drilling across an unrelated page — disproportionate for a color fix. CSS custom properties resolve through the existing `.dark` class cascade with no new state or plumbing, matching how every other themed surface in the app already works (Tailwind `dark:` utility classes reading the same class).

Recharts renders `stroke`/`fill` color props as literal SVG attribute values; modern browsers resolve `var(--x)` in SVG presentation attributes the same as in any CSS property, so `stroke="var(--chart-line)"` re-themes live when the `.dark` class toggles — no JS reactivity code needed.

### Change

Add to `frontend/src/index.css`:

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

(Dark values are existing palette tones — `cream-700`/`cream-300`/`sage-400`/`cream-800`/`cream-100`/`cream-700` — chosen for contrast against the card's `dark:bg-cream-800` background, matching the `text-sage-600 dark:text-sage-400` brightening pattern already used elsewhere in the app for accent colors on dark backgrounds.)

Update `frontend/src/components/TrendChart.tsx`:

```tsx
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
```

### What does NOT change

- No new component, no new dark-mode detection hook, no props threaded into `TrendChart` or `Report.tsx`.
- Chart layout, `ResponsiveContainer`, `h-48` sizing, margins — untouched.
- The `sr-only` text-alternative list (screen-reader content) — untouched.

---

## Edge Cases

- **Fix 1:** `HabitGrid.test.tsx`'s tests that assert on category header text (`Diario`, `Semanal`, `Fin de semana`, `Mensual`) already use the short-form wording (written in the previous session to match `CATEGORY_LABELS`, which is being deleted in favor of `FREQUENCY_LABELS`) — since the short-form values are moving into `FREQUENCY_LABELS` unchanged, those assertions keep passing without edits. Verified (grep across `frontend/src/**/*.test.tsx`) that no existing test anywhere asserts on the old long-form wording (`Diaria`, `Fin de Semana`) — `HabitRow.test.tsx`, `HabitReportCard.test.tsx`, and `AddHabitModal.test.tsx` don't check frequency label text at all, so no test file needs edits for this change.
- **Fix 2:** No dark-mode toggle exists in tests (jsdom doesn't apply real CSS cascade/`var()` resolution), so this is a visual-only fix — no test assertions target chart stroke/fill colors today, and none are being added (colors aren't behavior). Verification is manual/visual, in both light and dark mode.

## What Does NOT Change

- No backend, no data model, no routing, no other component beyond the four files listed in Scope.
- No other pages (`Tracker.tsx`, `History.tsx`) touched — dark-mode class toggling itself already works everywhere except this one chart.
