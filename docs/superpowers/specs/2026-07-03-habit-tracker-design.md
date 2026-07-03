# Habit Tracker App — Design Spec
**Date:** 2026-07-03  
**Status:** Approved

---

## Overview

Personal habit tracking web app modeled after the analog paper tracker in the reference image. Warm, cozy aesthetic. Single user with Firebase Auth. Monthly grid view: habits as rows, days as columns.

---

## Architecture

```
React (Vite) → FastAPI → Firestore
     ↑                        ↑
Firebase Auth SDK       Firebase Admin SDK
(frontend gets JWT)     (backend verifies JWT)
```

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + React Query + Axios  
- **Backend:** Python 3.12 + FastAPI + firebase-admin  
- **Database:** Firestore  
- **Auth:** Firebase Authentication (Email/Password + Google Sign-In)  
- **Deploy:** Firebase Hosting (frontend) + Railway or Render (backend)

---

## Data Model (Firestore)

```
users/{uid}/
  habits/{habit_id}
    name: str                    # e.g. "DRINK WATER"
    description: str | None      # e.g. "8 GLASSES"
    frequency: "daily" | "weekly" | "monthly"
    active: bool
    icon: str                    # emoji, e.g. "💧"
    color: str                   # pastel hex, e.g. "#a8d8ea"
    order: int                   # display order in grid
    current_streak: int          # consecutive days ending today/yesterday (backend computed)
    best_streak: int             # all-time best streak (backend computed)
    created_at: timestamp
    updated_at: timestamp

  completions/{completion_id}
    habit_id: str
    date: str                    # "YYYY-MM-DD"
    created_at: timestamp

  monthly_logs/{YYYY-MM}
    goal: str                    # "GOAL THIS MONTH" field
    notes: str                   # free-text notes area
    reflection_well: str         # "What went well this month?"
    reflection_improve: str      # "What can I improve?"
    reflection_proud: str        # "I am proud of myself for..."
```

---

## Default Habits (seeded on first login)

| # | Icon | Name | Description | Color |
|---|------|------|-------------|-------|
| 1 | 💧 | DRINK WATER | 8 GLASSES | #a8d8ea |
| 2 | 🏃 | EXERCISE | 30 MINUTES | #b8e0b8 |
| 3 | 🧘 | MEDITATE | 15 MINUTES | #d4a8d4 |
| 4 | 📖 | READ | 20 MINUTES | #f0c8a0 |
| 5 | 📝 | JOURNAL | DAILY | #f0e0a0 |
| 6 | 🛏️ | SLEEP EARLY | 7-8 HOURS | #a8c8e8 |
| 7 | 🥗 | EAT HEALTHY MEALS | — | #b8d8a8 |
| 8 | 📋 | PLAN YOUR DAY | EVERY MORNING | #e8c8a8 |
| 9 | ☀️ | GET SUNLIGHT | 15 MINUTES | #f8e0a0 |
| 10 | 📵 | LIMIT SCREEN TIME | LESS IS BEST | #f0b8b8 |
| 11 | 💡 | LEARN SOMETHING NEW | — | #c8d8f0 |
| 12 | ❤️ | BE GRATEFUL | DAILY | #f0b8c8 |
| 13 | 🧹 | CLEAN / TIDY SOMETHING | — | #c8e8d8 |
| 14 | 💰 | SAVE MONEY | DAILY | #d8f0b8 |
| 15 | 💬 | CONNECT WITH LOVED ONES | — | #e8c8f0 |
| 16 | ✈️ | NO SPEND DAY | WEEKLY | #c8e0f0 |

---

## API Endpoints

### Habits
```
GET    /api/habits              → list all habits (supports ?active=true|false)
GET    /api/habits/{id}         → habit detail
POST   /api/habits              → create { name, description, frequency, icon, color, order }
PATCH  /api/habits/{id}         → update name / description / frequency / active / icon / color / order
DELETE /api/habits/{id}         → delete habit
```

### Completions
```
POST   /api/habits/{id}/complete           body: { date: "YYYY-MM-DD" }  → mark complete; returns { current_streak, best_streak }
DELETE /api/habits/{id}/complete?date=YYYY-MM-DD                          → unmark complete; returns { current_streak, best_streak }
GET    /api/completions?month=YYYY-MM                                     → all completions for month
```
Note: DELETE uses query param (not body) — DELETE with body is non-standard HTTP.
Note: completions list is at `/api/completions` (not `/api/habits/completions`) to avoid FastAPI route conflict with `{id}` param.
Note: POST/DELETE /complete recomputes streak server-side and persists to habit document, returns updated streak values.

### Monthly Log
```
GET    /api/monthly-log?month=YYYY-MM   → get log (goal, notes, reflections)
POST   /api/monthly-log                 → create log for month
PATCH  /api/monthly-log/{YYYY-MM}       → update log fields
```

All endpoints require `Authorization: Bearer <firebase_jwt>` header. Backend verifies with Firebase Admin SDK and scopes all queries to `users/{uid}`.

---

## Backend Structure

```
backend/
  main.py              # FastAPI app init, CORS, router registration
  auth.py              # JWT verification dependency (firebase-admin)
  firebase.py          # Admin SDK init (singleton)
  routers/
    habits.py          # habits CRUD
    completions.py     # mark/unmark + month query
    monthly.py         # monthly log CRUD
  models/
    habit.py           # Pydantic models
    completion.py
    monthly_log.py
  requirements.txt
```

---

## Frontend Structure

```
frontend/
  src/
    pages/
      Login.tsx          # Firebase Auth UI (email + Google)
      Tracker.tsx        # main page — monthly grid view
    components/
      HabitGrid.tsx      # outer table: habits × 31 days
      HabitRow.tsx       # one habit: icon, name/desc, day cells, total, completion %, streak
      DayCell.tsx        # single checkbox cell (toggle complete/incomplete)
      WeeklyProgress.tsx # bottom section: week 1-5 dot circles
      MonthlyLog.tsx     # notes + 3 reflection prompts + goal field
      AddHabitModal.tsx  # create/edit habit (name, desc, icon, color, freq)
      MonthNav.tsx       # prev/next month arrows + month label + monthly level badge
      StreakBadge.tsx    # 🔥 N days streak display (per habit row)
      MonthlyLevel.tsx   # rank icon + label computed from overall completion %
    hooks/
      useHabits.ts       # React Query: fetch/mutate habits
      useCompletions.ts  # React Query: fetch month completions, toggle
      useMonthlyLog.ts   # React Query: fetch/update monthly log
    lib/
      firebase.ts        # Firebase app + Auth init
      api.ts             # Axios instance, injects Bearer token automatically
    App.tsx
    main.tsx
```

---

## Visual Design

### Style Reference
Matches the reference image: warm analog paper aesthetic, not modern SaaS.

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `bg-cream` | `#f5f0e8` | page background |
| `bg-paper` | `#faf7f2` | grid background |
| `text-dark` | `#3d3020` | primary text |
| `text-muted` | `#8a7560` | descriptions, secondary |
| `border-warm` | `#d4c4a8` | grid lines |

Each habit row has its own pastel `color` field used as a left-side accent bar and subtle row tint.

Note: `frequency` is display metadata only — all habits can be toggled on any day regardless of frequency. Weekly/monthly habits just indicate user intent, not grid restriction.

### Typography
- **Nunito** (Google Fonts) — body, habit names, numbers
- **Caveat** (Google Fonts) — handwritten sections: subtitle "Small habits, big changes. ♥", section headers, motivational footer text

### Layout — Main Tracker Page
```
┌──────────────────────────────────────────────────────────┐
│  🌿 HABIT TRACKER 🌿  (Nunito bold, large)               │
│     Small habits, big changes. ♥  (Caveat)               │
├─────────────────────────┬────────────────────────────────┤
│ ◀ Jul 2026 ▶  👑 Legend │ GOAL THIS MONTH: [__________] │
├─────────────────────────┴────────────────────────────────┤
│ HABIT          │ 1│ 2│ 3│...│31│ TOTAL │  %  │ STREAK  │
├────────────────┼──┼──┼──┼───┼──┼───────┼─────┼─────────┤
│ 💧 DRINK WATER │ ☑│  │ ☑│...│  │  12   │ 77% │ 🔥 5   │
│    8 glasses   │  │  │  │   │  │       │     │         │
├────────────────┼──┼──┼──┼───┼──┼───────┼─────┼─────────┤
│ ...            │  │  │  │   │  │       │     │         │
├──────────────────────────────────────────────────────────┤
│ WEEKLY PROGRESS                                          │
│ WEEK 1 (1-7)  ○ ○ ○ ○ ○ ○ ○                            │
│ WEEK 2 (8-14) ○ ○ ○ ○ ○ ○ ○                            │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ NOTES            │ MONTHLY REFLECTION                    │
│ [text area]      │ What went well?  [____]               │
│                  │ What can I improve? [__]              │
│                  │ I am proud of... [_____]              │
└──────────────────────────────────────────────────────────┘
│ MAKE IT A HABIT. BE CONSISTENT. YOU ARE BECOMING YOUR BEST SELF. ❤️ │
```

### Interactions
- Click day cell → toggle complete (optimistic update)
- Hover day cell → highlight
- Completed cell → filled with habit color
- Uncompleted cell → empty, warm border
- TOTAL column → auto-computed count of completed days in month
- % column → `(total / days_elapsed_in_month) * 100`, colored: green ≥80%, yellow 50–79%, red <50%
- STREAK column → shows `🔥 N` for active streak (completed today or yesterday); `💤` if streak is 0
- Weekly dots → 7 circles per week row; filled circle = habit completed that day (any habit); empty = no completions
- Monthly level badge (next to month nav) → computed from average completion % across all active habits:
  - 🌱 Beginner: 0–49%
  - ⚔️ Warrior: 50–74%
  - 🏆 Champion: 75–94%
  - 👑 Legend: 95–100%
- Month nav arrows → switch month, reload completions
- "+" button → opens AddHabitModal
- Habit row long-press / right-click → edit/delete options

---

## Auth Flow

1. User lands on `/login`
2. Signs in with Email or Google via Firebase Auth SDK
3. Frontend stores Firebase JWT in memory (not localStorage for security)
4. Axios interceptor reads `auth.currentUser.getIdToken()` and injects `Authorization: Bearer <token>` on every request
5. Token auto-refreshes via Firebase SDK (1 hour expiry)
6. Backend `auth.py` dependency: calls `firebase_admin.auth.verify_id_token(token)` → extracts `uid`
7. All Firestore queries scoped to `users/{uid}`

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| JWT expired | Firebase SDK auto-refreshes; if fails → redirect to login |
| Habit not found | Backend 404, frontend shows toast error |
| Toggle complete fails | Optimistic update reverted, toast error shown |
| Firestore offline | React Query cache serves stale data, banner shown |
| Month has no log | Returns empty object with defaults, not 404 |

---

## Motivational Footer

Bottom of page (Caveat font, muted):
> "MAKE IT A HABIT. BE CONSISTENT. YOU ARE BECOMING YOUR BEST SELF. ❤️"
