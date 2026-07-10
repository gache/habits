# Monthly Habit Report — Design

## Purpose

Users can currently only see per-month progress by staring at the day
grid. There's no page that answers "how did this month go, and am I
trending better or worse than before?" This adds a dedicated report page
that aggregates the month's behavior per habit and shows a 6-month trend.

## Architecture

- New route `/informe`, new lazy-loaded page `frontend/src/pages/Report.tsx`,
  wired into `App.tsx` the same way `Tracker`/`History` are.
- A button next to "Historial" in `Tracker.tsx`'s header opens `/informe`.
- The page reuses `MonthNav` to pick the reported month. The 6-month trend
  chart's window always ends at the currently selected month, so navigating
  months shifts the trend window with it — one navigation control drives
  both the per-habit breakdown and the trend chart.
- New dependency: `recharts`, for the trend line chart.

## Data flow

- `useHabits(true)` for the active habit list (existing hook, no change).
- A 6-month-wide `useCompletionsForMonths` call (existing hook, already used
  by `History.tsx` with a 12-month window) supplies every completion needed
  for both the trend chart and the per-habit cards — no new API endpoints.
- New pure functions in `frontend/src/lib/report-utils.ts`, all operating on
  data already in memory (no new backend calls):
  - `monthlyGlobalPct(habits, completions, monthStr): number` — global %
    completed for one month, aggregating every habit's
    `countCompletedPeriods`/`habitPeriodsElapsed`. `Tracker.tsx` computes
    this exact formula inline today for its header badge (`globalPct`) —
    this function replaces that inline calc too (`Tracker.tsx` calls it for
    its own current month), so the formula has one home instead of two.
  - `missedPeriods(habit, completions, monthStr): string[]` — for
    daily/weekly/weekend habits, the periods within that month with no
    completion (daily: day numbers; weekly/weekend: which week). Returns
    `[]` for monthly habits (a single-period frequency has nothing to list
    within one month — it either completed its one period or didn't,
    already visible from the % bar).
  - `weekdayPattern(completions, monthStr): { weekday: number; rate: number }[]` —
    for daily habits only, completion rate (0–1) per weekday across the
    month, source data for the mini bar chart. `weekday` uses the same
    `Date.getDay()` convention already used by `isWeekday`/`isWeekend` in
    `date-utils.ts` (0=Sun..6=Sat), for consistency with the rest of the
    codebase. Not computed for other frequencies (not enough same-weekday
    data points in a single month for the pattern to mean anything).

## Components

- `Report.tsx` (page): header, `MonthNav`, renders `TrendChart` + one
  `HabitReportCard` per active habit.
- `TrendChart.tsx`: recharts `LineChart`, one line, x-axis = month label,
  y-axis = `monthlyGlobalPct` for that month. 6 points, oldest to newest,
  ending at the selected month.
- `HabitReportCard.tsx`: per habit —
  - % bar for the selected month (reuses the same progress-bar visual
    pattern `HabitRow` already uses).
  - Current streak + best streak (reuses `calcPeriodStreak`/
    `calcBestPeriodStreak`, already frequency-aware).
  - Missed-periods list (from `missedPeriods`) — hidden entirely for
    monthly habits, per the function's empty-array contract above.
  - Weekday mini bar chart (from `weekdayPattern`) — daily habits only;
    other frequencies skip this block.

## Error handling

- No active habits: page shows the same "Aún no hay hábitos" empty state
  pattern `HabitGrid` already uses.
- A habit created mid-window (e.g. 2 months ago): `monthlyGlobalPct` and the
  per-habit card both already rely on `habitDaysElapsed`/
  `habitPeriodsElapsed`, which zero out months before creation — no new
  handling needed, this falls out of reusing the existing functions.
- Recharts requires a non-empty, fixed-shape data array — `TrendChart`
  always receives exactly 6 points (a month with zero habits/completions
  yields `monthlyGlobalPct = 0`, not `null` or missing), so there's no
  sparse-data case to special-case in the chart itself.

## Testing

- `report-utils.test.ts`: unit tests for `monthlyGlobalPct`,
  `missedPeriods`, and `weekdayPattern` — cases: a month with full
  completions, a month with zero completions, a habit created mid-month,
  and one of each frequency (daily/weekly/monthly/weekend) for
  `missedPeriods` specifically (confirming the monthly case returns `[]`).
- `Report.test.tsx`: render test with mocked hooks confirming the page
  renders the trend chart and one card per habit, and the empty-habits
  state.

## Out of scope (YAGNI)

- Exporting the report (image/PDF/text) — not requested, no export
  mechanism exists anywhere else in the app either.
- Multi-month trend lines per individual habit (only the global 6-month
  trend was requested).
- Backend changes — everything here is computed client-side from data
  already fetched elsewhere in the app.
