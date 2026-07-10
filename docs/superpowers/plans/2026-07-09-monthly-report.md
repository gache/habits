# Monthly Habit Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/informe` page showing a 6-month completion-% trend chart and a per-habit monthly breakdown (percent, streaks, missed periods, weekday pattern for daily habits).

**Architecture:** New pure aggregation functions in `frontend/src/lib/report-utils.ts` operate on data already fetched by existing hooks (`useHabits`, `useCompletionsForMonths`) — no backend changes. A new `Report.tsx` page composes a new `TrendChart.tsx` (recharts line chart) and a new `HabitReportCard.tsx` (one per active habit) driven by those functions.

**Tech Stack:** React 18, TypeScript, Tailwind, `recharts` (new dependency) for the trend chart, Vitest + Testing Library for tests.

## Global Constraints

- New route: `/informe`, page component `frontend/src/pages/Report.tsx`.
- New dependency: `recharts` (run `npm install recharts` in `frontend/`).
- `monthlyGlobalPct` returns `0` (never `null`) when there is nothing to report — the trend chart always gets exactly 6 numeric points, no sparse-data handling needed downstream.
- `missedPeriods` returns `[]` for `monthly`-frequency habits, always — a single-period-per-month frequency has nothing to list within one month.
- `weekdayPattern`'s `weekday` field uses `Date.getDay()` convention (0=Sun..6=Sat) — same as `isWeekday`/`isWeekend` in `frontend/src/lib/date-utils.ts`. Only called for `daily`-frequency habits.
- `Tracker.tsx`'s existing inline global-%-badge calculation is replaced by a call to `monthlyGlobalPct` (Task 4) — one formula, not two copies.

---

### Task 1: `report-utils.ts` aggregation functions

**Files:**
- Create: `frontend/src/lib/report-utils.ts`
- Test: `frontend/src/lib/__tests__/report-utils.test.ts`

**Interfaces:**
- Consumes: `Habit` (`frontend/src/hooks/useHabits.ts`), `Completion` (`frontend/src/hooks/useCompletions.ts`), and from `frontend/src/lib/date-utils.ts`: `pad`, `getDaysInMonth`, `todayStr`, `habitDaysElapsed`, `habitPeriodsElapsed`, `countCompletedPeriods`, `periodBounds`.
- Produces (used by Tasks 3 and 4):
  - `monthlyGlobalPct(habits: Habit[], completions: Completion[], monthStr: string): number`
  - `missedPeriods(habit: Habit, completions: Completion[], monthStr: string): string[]`
  - `weekdayPattern(completions: Completion[], monthStr: string): { weekday: number; rate: number }[]`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/__tests__/report-utils.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { monthlyGlobalPct, missedPeriods, weekdayPattern } from '../report-utils'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Leer',
    description: null,
    frequency: 'daily',
    active: true,
    icon: '📚',
    color: '#b8d8a8',
    order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

function makeCompletion(habitId: string, date: string): Completion {
  return { id: `c-${habitId}-${date}`, habit_id: habitId, date, created_at: null }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('monthlyGlobalPct', () => {
  it('returns 0 when there are no habits', () => {
    expect(monthlyGlobalPct([], [], '2026-06')).toBe(0)
  })

  it('returns 100 for a fully-completed past month', () => {
    const habit = makeHabit({ frequency: 'daily' })
    const completions = Array.from({ length: 30 }, (_, i) =>
      makeCompletion('h1', `2026-06-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-06')).toBe(100)
  })

  it('returns 0 for a past month with zero completions', () => {
    const habit = makeHabit()
    expect(monthlyGlobalPct([habit], [], '2026-06')).toBe(0)
  })

  it('ignores a habit not yet created in that month', () => {
    const habit = makeHabit({ created_at: '2026-07-01T00:00:00Z' })
    expect(monthlyGlobalPct([habit], [], '2026-06')).toBe(0)
  })

  it('only counts days elapsed so far for the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15)) // July 15 2026
    const habit = makeHabit({ frequency: 'daily' })
    const completions = Array.from({ length: 15 }, (_, i) =>
      makeCompletion('h1', `2026-07-${String(i + 1).padStart(2, '0')}`),
    )
    expect(monthlyGlobalPct([habit], completions, '2026-07')).toBe(100)
  })
})

describe('missedPeriods', () => {
  it('returns an empty list for monthly habits regardless of completions', () => {
    const habit = makeHabit({ frequency: 'monthly' })
    expect(missedPeriods(habit, [], '2026-06')).toEqual([])
  })

  it('lists missed day numbers for a daily habit in a past month', () => {
    const habit = makeHabit({ frequency: 'daily' })
    // June 2026 has 30 days; complete every day except the 5th and the 20th.
    const completions = Array.from({ length: 30 }, (_, i) => i + 1)
      .filter((day) => day !== 5 && day !== 20)
      .map((day) => makeCompletion('h1', `2026-06-${String(day).padStart(2, '0')}`))
    expect(missedPeriods(habit, completions, '2026-06')).toEqual(['5', '20'])
  })

  it('lists missed weeks for a weekly habit', () => {
    const habit = makeHabit({ frequency: 'weekly' })
    // July 2026: Monday July 6th starts a week. Complete a day in that
    // week, skip the week starting July 13th entirely.
    const completions = [makeCompletion('h1', '2026-07-08')]
    const missed = missedPeriods(habit, completions, '2026-07')
    expect(missed).toContain('13-19')
    expect(missed).not.toContain('6-12')
  })

  it('lists missed weekends for a weekend habit the same way weekly lists weeks', () => {
    const habit = makeHabit({ frequency: 'weekend' })
    const completions = [makeCompletion('h1', '2026-07-11')] // Saturday, in the week of the 6th
    const missed = missedPeriods(habit, completions, '2026-07')
    expect(missed).not.toContain('6-12')
    expect(missed).toContain('13-19')
  })
})

describe('weekdayPattern', () => {
  it('returns 7 entries, one per weekday, with rate 0 when nothing completed', () => {
    const result = weekdayPattern([], '2026-06')
    expect(result).toHaveLength(7)
    expect(result.every((r) => r.rate === 0)).toBe(true)
  })

  it('computes the completion rate per weekday for a past month', () => {
    // June 2026: the 1st is a Monday. Complete every Monday, skip everything else.
    const mondays = ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29']
    const completions = mondays.map((d) => makeCompletion('h1', d))
    const result = weekdayPattern(completions, '2026-06')
    const monday = result.find((r) => r.weekday === 1)
    const tuesday = result.find((r) => r.weekday === 2)
    expect(monday?.rate).toBe(1)
    expect(tuesday?.rate).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/__tests__/report-utils.test.ts`
Expected: FAIL — `Cannot find module '../report-utils'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/report-utils.ts`:

```ts
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import {
  pad,
  getDaysInMonth,
  todayStr,
  habitDaysElapsed,
  habitPeriodsElapsed,
  countCompletedPeriods,
  periodBounds,
} from './date-utils'

/**
 * Day-of-month to report through: the full month if `monthStr` is already
 * in the past, or today's date-of-month if it's the current month — can't
 * report on days that haven't happened yet.
 */
function lastReportableDay(monthStr: string): number {
  const today = todayStr()
  const [year, month] = monthStr.split('-').map(Number)
  const isCurrentMonth = monthStr === today.slice(0, 7)
  return isCurrentMonth ? new Date().getDate() : getDaysInMonth(year, month)
}

/**
 * Global % of all habits' periods completed for one month — the same
 * formula Tracker.tsx's header badge used to compute inline, factored out
 * here so the monthly report can compute it for every month in its trend
 * window too. Returns 0 (never null) when there's nothing to report, so a
 * 6-point trend chart never has a missing/undefined point.
 */
export function monthlyGlobalPct(habits: Habit[], completions: Completion[], monthStr: string): number {
  const today = todayStr()
  const daysElapsed = lastReportableDay(monthStr)
  const totalPossible = habits.reduce(
    (sum, h) => sum + habitPeriodsElapsed(h.frequency, habitDaysElapsed(h.created_at, monthStr, daysElapsed)),
    0,
  )
  const completedUpToToday = habits.reduce((sum, h) => {
    const dates = new Set(
      completions.filter((c) => c.habit_id === h.id && c.date.startsWith(monthStr)).map((c) => c.date),
    )
    return sum + countCompletedPeriods(h.frequency, dates, today)
  }, 0)
  return totalPossible > 0 ? Math.min(100, Math.round((completedUpToToday / totalPossible) * 100)) : 0
}

/**
 * Periods within `monthStr` that this habit has no completion for — day
 * numbers (as strings) for daily habits, "start-end" day-range labels for
 * weekly/weekend (one entry per missed week). Monthly habits always return
 * `[]` — a single-period-per-month frequency has nothing to list within
 * one month; that's already visible from whether its one period was
 * completed at all.
 */
export function missedPeriods(habit: Habit, completions: Completion[], monthStr: string): string[] {
  if (habit.frequency === 'monthly') return []

  const lastDay = lastReportableDay(monthStr)
  const habitDates = new Set(
    completions.filter((c) => c.habit_id === habit.id && c.date.startsWith(monthStr)).map((c) => c.date),
  )

  if (habit.frequency === 'daily') {
    const missed: string[] = []
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${monthStr}-${pad(day)}`
      if (!habitDates.has(dateStr)) missed.push(String(day))
    }
    return missed
  }

  // weekly / weekend: one entry per week with zero completions anywhere in
  // its bounds.
  const missed: string[] = []
  const seenWeekStarts = new Set<string>()
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${monthStr}-${pad(day)}`
    const [weekStart, weekEnd] = periodBounds(habit.frequency, dateStr)!
    if (seenWeekStarts.has(weekStart)) continue
    seenWeekStarts.add(weekStart)
    const hasCompletion = [...habitDates].some((d) => d >= weekStart && d <= weekEnd)
    if (!hasCompletion) {
      missed.push(`${Number(weekStart.slice(8))}-${Number(weekEnd.slice(8))}`)
    }
  }
  return missed
}

/**
 * Completion rate (0-1) per weekday across `monthStr`, for one habit's
 * already-filtered completions — source data for the daily-habit weekday
 * mini bar chart. `weekday` follows `Date.getDay()` (0=Sun..6=Sat), same as
 * `isWeekday`/`isWeekend` elsewhere in date-utils.ts. Only meaningful for
 * daily habits (weekly/monthly/weekend don't have enough same-weekday data
 * points in one month for a pattern to mean anything) — callers are
 * expected to only call this for daily habits.
 */
export function weekdayPattern(completions: Completion[], monthStr: string): { weekday: number; rate: number }[] {
  const lastDay = lastReportableDay(monthStr)
  const habitDates = new Set(completions.map((c) => c.date))

  const totals = Array.from({ length: 7 }, () => ({ elapsed: 0, completed: 0 }))
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${monthStr}-${pad(day)}`
    const weekday = new Date(`${dateStr}T00:00:00`).getDay()
    totals[weekday].elapsed++
    if (habitDates.has(dateStr)) totals[weekday].completed++
  }
  return totals.map((t, weekday) => ({
    weekday,
    rate: t.elapsed > 0 ? t.completed / t.elapsed : 0,
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/__tests__/report-utils.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `cd frontend && npx tsc --noEmit && npx eslint src --ext .ts,.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/report-utils.ts frontend/src/lib/__tests__/report-utils.test.ts
git commit -m "Add report-utils: monthlyGlobalPct, missedPeriods, weekdayPattern"
```

---

### Task 2: `TrendChart` component (recharts)

**Files:**
- Modify: `frontend/package.json` (add `recharts` dependency)
- Modify: `frontend/src/test/setup.ts` (ResizeObserver polyfill)
- Create: `frontend/src/components/TrendChart.tsx`
- Test: `frontend/src/components/__tests__/TrendChart.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 directly (takes pre-computed points as a prop).
- Produces (used by Task 4): `TrendChart` component, prop `points: { monthStr: string; pct: number }[]` (exactly 6 entries, oldest to newest).

- [ ] **Step 1: Install recharts**

Run: `cd frontend && npm install recharts`
Expected: `package.json` `dependencies` gains a `"recharts": "^..."` line; run `git diff frontend/package.json frontend/package-lock.json` to confirm.

- [ ] **Step 2: Add the ResizeObserver polyfill jsdom doesn't provide**

jsdom (the test environment) has no `ResizeObserver`, but recharts'
`ResponsiveContainer` constructs one on mount — without a stub, any test
that renders a recharts chart throws `ReferenceError: ResizeObserver is not
defined`.

Read the current content first:

```bash
cat frontend/src/test/setup.ts
```

Replace `frontend/src/test/setup.ts` with:

```ts
import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver, but recharts' ResponsiveContainer
// constructs one on mount and would otherwise throw in every test that
// renders a chart.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver)
```

- [ ] **Step 3: Write the failing test**

Create `frontend/src/components/__tests__/TrendChart.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrendChart from '../TrendChart'

describe('TrendChart', () => {
  it('renders an accessible text point for each month in the trend', () => {
    render(
      <TrendChart
        points={[
          { monthStr: '2026-02', pct: 40 },
          { monthStr: '2026-03', pct: 55 },
          { monthStr: '2026-04', pct: 60 },
          { monthStr: '2026-05', pct: 70 },
          { monthStr: '2026-06', pct: 65 },
          { monthStr: '2026-07', pct: 80 },
        ]}
      />,
    )
    expect(screen.getByText('2026-07: 80%')).toBeInTheDocument()
    expect(screen.getByText('2026-02: 40%')).toBeInTheDocument()
  })

  it('renders the trend heading', () => {
    render(<TrendChart points={[{ monthStr: '2026-07', pct: 50 }]} />)
    expect(screen.getByText(/TENDENCIA/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/__tests__/TrendChart.test.tsx`
Expected: FAIL — `Cannot find module '../TrendChart'`.

- [ ] **Step 5: Write the implementation**

Create `frontend/src/components/TrendChart.tsx`:

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export interface TrendPoint {
  monthStr: string // "YYYY-MM"
  pct: number
}

interface TrendChartProps {
  points: TrendPoint[]
}

export default function TrendChart({ points }: TrendChartProps) {
  const chartData = points.map((p) => {
    const month = Number(p.monthStr.split('-')[1])
    return { label: MONTH_ABBR[month - 1], pct: p.pct }
  })

  return (
    <div className="bg-cream-50 dark:bg-cream-800 border border-cream-300 dark:border-cream-600 rounded-xl p-4 mb-6">
      <h2 className="font-sans font-extrabold text-base tracking-widest text-cream-800 dark:text-cream-100 mb-3">
        TENDENCIA (6 MESES)
      </h2>
      <div className="h-48" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5dcc8" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8a7550' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8a7550' }} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Completado']} />
            <Line type="monotone" dataKey="pct" stroke="#457040" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Text alternative for screen readers (and what tests assert on) —
          the chart above is aria-hidden since this list carries the same
          information accessibly. */}
      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.monthStr}>
            {p.monthStr}: {p.pct}%
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/__tests__/TrendChart.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 7: Typecheck and lint**

Run: `cd frontend && npx tsc --noEmit && npx eslint src --ext .ts,.tsx`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/test/setup.ts frontend/src/components/TrendChart.tsx frontend/src/components/__tests__/TrendChart.test.tsx
git commit -m "Add TrendChart component using recharts"
```

---

### Task 3: `HabitReportCard` component

**Files:**
- Create: `frontend/src/components/HabitReportCard.tsx`
- Test: `frontend/src/components/__tests__/HabitReportCard.test.tsx`

**Interfaces:**
- Consumes: `missedPeriods`, `weekdayPattern` (Task 1, `frontend/src/lib/report-utils.ts`); `calcPeriodStreak`, `calcBestPeriodStreak`, `habitDaysElapsed`, `habitPeriodsElapsed`, `countCompletedPeriods`, `todayStr` (`frontend/src/lib/date-utils.ts`); `periodUnitLabel` (`frontend/src/lib/streak-levels.ts`); `FREQUENCY_LABELS`, `FREQUENCY_BADGE_STYLES` (`frontend/src/lib/habit-presets.ts`); `getProgressColor` (`frontend/src/lib/progress-color.ts`); `Habit` type, `Completion` type.
- Produces (used by Task 4): `HabitReportCard` component with props:
  ```ts
  interface HabitReportCardProps {
    habit: Habit
    monthStr: string              // "YYYY-MM"
    monthCompletions: Completion[]  // this habit's completions, already scoped to monthStr
    streakCompletions: Completion[] // this habit's completions, wider window (for streak calc)
    daysElapsed: number
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/__tests__/HabitReportCard.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HabitReportCard from '../HabitReportCard'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Leer',
    description: null,
    frequency: 'daily',
    active: true,
    icon: '📚',
    color: '#b8d8a8',
    order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('HabitReportCard', () => {
  it('shows 100% for a fully-completed past month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    const completions: Completion[] = Array.from({ length: 31 }, (_, i) => ({
      id: `c${i}`,
      habit_id: 'h1',
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      created_at: null,
    }))
    render(
      <HabitReportCard
        habit={makeHabit()}
        monthStr="2026-07"
        monthCompletions={completions}
        streakCompletions={completions}
        daysElapsed={31}
      />,
    )
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('lists missed days for a daily habit with zero completions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    render(
      <HabitReportCard
        habit={makeHabit()}
        monthStr="2026-07"
        monthCompletions={[]}
        streakCompletions={[]}
        daysElapsed={31}
      />,
    )
    expect(screen.getByText(/Días fallados:/)).toBeInTheDocument()
  })

  it('does not show a missed-periods line for monthly habits', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    render(
      <HabitReportCard
        habit={makeHabit({ frequency: 'monthly' })}
        monthStr="2026-07"
        monthCompletions={[]}
        streakCompletions={[]}
        daysElapsed={31}
      />,
    )
    expect(screen.queryByText(/Días fallados:|Semanas falladas:/)).not.toBeInTheDocument()
  })

  it('shows the current and best streak', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31))
    const completions: Completion[] = [
      { id: 'c1', habit_id: 'h1', date: '2026-07-30', created_at: null },
      { id: 'c2', habit_id: 'h1', date: '2026-07-31', created_at: null },
    ]
    render(
      <HabitReportCard
        habit={makeHabit()}
        monthStr="2026-07"
        monthCompletions={completions}
        streakCompletions={completions}
        daysElapsed={31}
      />,
    )
    expect(screen.getByText(/Racha: 2 días/)).toBeInTheDocument()
    expect(screen.getByText(/Mejor: 2 días/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitReportCard.test.tsx`
Expected: FAIL — `Cannot find module '../HabitReportCard'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/HabitReportCard.tsx`:

```tsx
import { CalendarBlank } from '@phosphor-icons/react'
import { type Habit } from '@/hooks/useHabits'
import { type Completion } from '@/hooks/useCompletions'
import {
  calcPeriodStreak,
  calcBestPeriodStreak,
  habitDaysElapsed,
  habitPeriodsElapsed,
  countCompletedPeriods,
  todayStr,
} from '@/lib/date-utils'
import { periodUnitLabel } from '@/lib/streak-levels'
import { FREQUENCY_LABELS, FREQUENCY_BADGE_STYLES } from '@/lib/habit-presets'
import { getProgressColor } from '@/lib/progress-color'
import { missedPeriods, weekdayPattern } from '@/lib/report-utils'

interface HabitReportCardProps {
  habit: Habit
  monthStr: string // "YYYY-MM"
  monthCompletions: Completion[] // this habit's completions, already scoped to monthStr
  streakCompletions: Completion[] // this habit's completions, wider window (for streak calc)
  daysElapsed: number
}

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export default function HabitReportCard({
  habit,
  monthStr,
  monthCompletions,
  streakCompletions,
  daysElapsed,
}: HabitReportCardProps) {
  const today = todayStr()
  const monthDates = new Set(monthCompletions.map((c) => c.date))
  const streakDates = new Set(streakCompletions.map((c) => c.date))

  const completed = countCompletedPeriods(habit.frequency, monthDates, today)
  const possible = habitPeriodsElapsed(habit.frequency, habitDaysElapsed(habit.created_at, monthStr, daysElapsed))
  const pct = possible > 0 ? Math.min(100, Math.round((completed / possible) * 100)) : 0
  const pctColor = getProgressColor(pct)

  const streak = calcPeriodStreak(habit.frequency, streakDates)
  const bestStreak = calcBestPeriodStreak(habit.frequency, streakDates)

  const missed = missedPeriods(habit, monthCompletions, monthStr)
  const pattern = habit.frequency === 'daily' ? weekdayPattern(monthCompletions, monthStr) : null

  return (
    <div className="bg-cream-50 dark:bg-cream-800 border border-cream-300 dark:border-cream-600 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans font-bold text-base text-cream-800 dark:text-cream-100 truncate">
            {habit.icon} {habit.name}
          </span>
          <span
            className={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-sm font-bold uppercase tracking-wide shrink-0',
              FREQUENCY_BADGE_STYLES[habit.frequency],
            ].join(' ')}
          >
            <CalendarBlank size={11} weight="bold" aria-hidden="true" /> {FREQUENCY_LABELS[habit.frequency]}
          </span>
        </div>
        <span className="font-sans font-800 text-lg tabular-nums shrink-0" style={{ color: pctColor }}>
          {pct}%
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-cream-200 dark:bg-cream-700 overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: pctColor }}
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-cream-700 dark:text-cream-300 mb-2">
        <span>
          🔥 Racha: {streak} {periodUnitLabel(habit.frequency, streak)}
        </span>
        <span>
          🏆 Mejor: {bestStreak} {periodUnitLabel(habit.frequency, bestStreak)}
        </span>
      </div>

      {missed.length > 0 && (
        <p className="text-sm text-cream-600 dark:text-cream-400">
          {habit.frequency === 'daily' ? 'Días fallados: ' : 'Semanas falladas: '}
          {missed.join(', ')}
        </p>
      )}

      {pattern && (
        <div className="flex items-end gap-1 mt-3">
          {pattern.map((p) => (
            <div key={p.weekday} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-cream-200 dark:bg-cream-700 rounded-sm overflow-hidden flex flex-col justify-end"
                style={{ height: '32px' }}
              >
                <div
                  className="w-full rounded-sm"
                  style={{ height: `${p.rate * 100}%`, backgroundColor: habit.color }}
                />
              </div>
              <span className="text-xs text-cream-500 dark:text-cream-500">{WEEKDAY_LABELS[p.weekday]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/__tests__/HabitReportCard.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `cd frontend && npx tsc --noEmit && npx eslint src --ext .ts,.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/HabitReportCard.tsx frontend/src/components/__tests__/HabitReportCard.test.tsx
git commit -m "Add HabitReportCard component"
```

---

### Task 4: `Report` page, routing, and Tracker refactor

**Files:**
- Create: `frontend/src/pages/Report.tsx`
- Test: `frontend/src/pages/__tests__/Report.test.tsx`
- Modify: `frontend/src/App.tsx` (add `/informe` route)
- Modify: `frontend/src/pages/Tracker.tsx` (add nav button; replace inline `globalPct` calc with `monthlyGlobalPct`)

**Interfaces:**
- Consumes: `TrendChart` (Task 2), `HabitReportCard` (Task 3), `monthlyGlobalPct` (Task 1), `useHabits`, `useCompletionsForMonths`, `MonthNav`, `pad`, `getDaysInMonth`, `todayStr`, `recentMonthStrs` (all existing).
- Produces: route `/informe`; no other task depends on this one.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/Report.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import Report from '../Report'
import { type Habit } from '@/hooks/useHabits'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const HABIT: Habit = {
  id: 'h1',
  name: 'Leer',
  description: null,
  frequency: 'daily',
  active: true,
  icon: '📚',
  color: '#b8d8a8',
  order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
}

describe('Report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders one card per active habit and the trend chart', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [HABIT] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Leer/)).toBeInTheDocument()
    expect(screen.getByText(/TENDENCIA/)).toBeInTheDocument()
  })

  it('shows the empty state when there are no habits', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/habits') return Promise.resolve({ data: [] })
      if (url === '/api/completions') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`unexpected url ${url}`))
    })

    render(<Report />, { wrapper: wrapper() })

    expect(await screen.findByText(/Aún no hay hábitos/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/__tests__/Report.test.tsx`
Expected: FAIL — `Cannot find module '../Report'`.

- [ ] **Step 3: Write the Report page**

Create `frontend/src/pages/Report.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, ChartLineUp } from '@phosphor-icons/react'
import { useHabits } from '@/hooks/useHabits'
import { useCompletionsForMonths } from '@/hooks/useCompletions'
import MonthNav from '@/components/MonthNav'
import TrendChart from '@/components/TrendChart'
import HabitReportCard from '@/components/HabitReportCard'
import { pad, getDaysInMonth, todayStr, recentMonthStrs } from '@/lib/date-utils'
import { monthlyGlobalPct } from '@/lib/report-utils'

export default function Report() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const monthStr = `${year}-${pad(month)}`

  const { data: habits = [], isLoading } = useHabits(true)

  // Trend window: the 6 months ending at the selected month — offset from
  // "today" by however many months back the user has navigated, so
  // browsing to a past month shifts the trend window with it.
  const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  const trendMonths = useMemo(() => {
    const all = recentMonthStrs(monthsAgo + 6)
    return all.slice(monthsAgo, monthsAgo + 6).reverse() // oldest to newest
  }, [monthsAgo])
  const { data: trendCompletions = [] } = useCompletionsForMonths(trendMonths)

  // Streaks are about "right now," not the browsed month — always a
  // 12-month window anchored to today, same pattern Tracker.tsx uses for
  // HabitGrid, so streak numbers read the same on both pages.
  const streakMonths = useMemo(() => recentMonthStrs(12), [])
  const { data: streakCompletions = [] } = useCompletionsForMonths(streakMonths)

  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : getDaysInMonth(year, month)

  const trendPoints = trendMonths.map((m) => ({ monthStr: m, pct: monthlyGlobalPct(habits, trendCompletions, m) }))

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-cream-950 transition-colors duration-200">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-700 dark:text-cream-200 flex items-center justify-center transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
            aria-label="Volver al Tracker"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <div>
            <h1 className="font-sans font-extrabold text-3xl tracking-widest text-cream-800 dark:text-cream-100 flex items-center gap-2">
              <ChartLineUp size={22} weight="fill" aria-hidden="true" />
              INFORME
            </h1>
            <p className="font-handwritten text-cream-700 dark:text-cream-400 text-lg">
              Cómo evolucionó cada hábito este mes.
            </p>
          </div>
        </div>

        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-xl px-4 py-3 mb-6 shadow-xs">
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
        </div>

        <TrendChart points={trendPoints} />

        {isLoading ? (
          <div className="animate-pulse space-y-3" role="status" aria-label="Cargando informe">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-cream-200 dark:bg-cream-700" />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <p className="text-center py-8 text-cream-700 dark:text-cream-400 font-handwritten text-lg">
            Aún no hay hábitos — ¡agrega uno con el botón +!
          </p>
        ) : (
          habits.map((habit) => (
            <HabitReportCard
              key={habit.id}
              habit={habit}
              monthStr={monthStr}
              monthCompletions={trendCompletions.filter(
                (c) => c.habit_id === habit.id && c.date.startsWith(monthStr),
              )}
              streakCompletions={streakCompletions.filter((c) => c.habit_id === habit.id)}
              daysElapsed={daysElapsed}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/__tests__/Report.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Wire the route into `App.tsx`**

Read the current file:

```bash
cat frontend/src/App.tsx
```

Apply these two edits:

1. Add the lazy import, right after the `History` import:

```ts
const History = lazy(() => import('@/pages/History'))
const Report = lazy(() => import('@/pages/Report'))
```

2. Add the route inside the authenticated `<Routes>` block:

```tsx
<Route path="/" element={<Tracker />} />
<Route path="/history" element={<History />} />
<Route path="/informe" element={<Report />} />
<Route path="*" element={<Navigate to="/" replace />} />
```

- [ ] **Step 6: Add the nav button and replace the inline % calc in `Tracker.tsx`**

Read the current file:

```bash
cat frontend/src/pages/Tracker.tsx
```

Apply these edits:

1. Change the icon import line to add `ChartLineUp`:

```ts
import { Plant, Sun, Moon, CalendarBlank, ChartLineUp, Plus, SignOut, Heart } from '@phosphor-icons/react'
```

2. Change the date-utils import line — drop `getDaysInMonth`, `todayStr`, `habitDaysElapsed`, `habitPeriodsElapsed`, `countCompletedPeriods` (none are used anywhere else in this file — confirmed by `grep -n "\btoday\b\|getDaysInMonth\|habitDaysElapsed\|habitPeriodsElapsed\|countCompletedPeriods" frontend/src/pages/Tracker.tsx`, every hit is inside the block being replaced in step 4) and keep `pad`, `recentMonthStrs`:

```ts
import { pad, recentMonthStrs } from '@/lib/date-utils'
```

3. Add the `monthlyGlobalPct` import, right after the `progress-color` import:

```ts
import { getProgressColor } from '@/lib/progress-color'
import { monthlyGlobalPct } from '@/lib/report-utils'
```

4. Replace this whole block (the `today` var through `pctColor`):

```ts
  const today = todayStr()
  const isCurrentMonth = monthStr === today.slice(0, 7)
  const daysElapsed = isCurrentMonth ? new Date().getDate() : getDaysInMonth(year, month)
  const totalPossible = habits.reduce(
    (sum, h) => sum + habitPeriodsElapsed(h.frequency, habitDaysElapsed(h.created_at, monthStr, daysElapsed)), 0,
  )
  const completedUpToToday = habits.reduce((sum, h) => {
    const dates = new Set(completions.filter((c) => c.habit_id === h.id).map((c) => c.date))
    return sum + countCompletedPeriods(h.frequency, dates, today)
  }, 0)
  const globalPct = totalPossible > 0
    ? Math.min(100, Math.round((completedUpToToday / totalPossible) * 100))
    : null
  const pctColor = globalPct === null ? '#a88c58' : getProgressColor(globalPct)
```

with:

```ts
  const globalPct = habits.length > 0 ? monthlyGlobalPct(habits, completions, monthStr) : null
  const pctColor = globalPct === null ? '#a88c58' : getProgressColor(globalPct)
```

5. Add the "Informe" button right after the "Historial" button (same header controls block):

```tsx
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1.5 h-11 text-sm font-600 text-cream-600 dark:text-cream-300 border border-cream-200 dark:border-cream-700 rounded-full px-4 hover:bg-cream-200 dark:hover:bg-cream-800 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <CalendarBlank size={13} weight="bold" aria-hidden="true" />
              Historial
            </button>
            <button
              onClick={() => navigate('/informe')}
              className="flex items-center gap-1.5 h-11 text-sm font-600 text-cream-600 dark:text-cream-300 border border-cream-200 dark:border-cream-700 rounded-full px-4 hover:bg-cream-200 dark:hover:bg-cream-800 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ChartLineUp size={13} weight="bold" aria-hidden="true" />
              Informe
            </button>
```

- [ ] **Step 7: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — every existing test still passes, plus the new ones from Tasks 1-4.

- [ ] **Step 8: Typecheck, lint, and build**

Run: `cd frontend && npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npx vite build`
Expected: no errors; build succeeds (confirms recharts bundles cleanly for production).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/Report.tsx frontend/src/pages/__tests__/Report.test.tsx frontend/src/App.tsx frontend/src/pages/Tracker.tsx
git commit -m "Add /informe report page, wire route and Tracker nav button"
```

---

## Manual verification (after Task 4)

1. `cd frontend && npm run dev`, open the app, log in.
2. Click "Informe" in the Tracker header — the `/informe` page loads with the trend chart and one card per habit.
3. Use the month arrows — the per-habit cards update, and the trend chart's 6-month window shifts to end at the newly selected month.
4. Confirm a `daily`-frequency habit's card shows the weekday mini bar chart and a "Días fallados" list (if it has any); confirm a `monthly`-frequency habit's card shows neither.
5. Confirm the Tracker page's "Este mes" badge still shows the same percentage as before this change (spot-check against the `/informe` page's card for the same habit/month).
