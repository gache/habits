# Habit Tracker 🌿

Personal habit tracking app — warm analog aesthetic, Firebase Auth, FastAPI backend, Firestore.

## Stack
- **Frontend:** Vite + React + TypeScript + Tailwind CSS + React Query
- **Backend:** Python 3.12 + FastAPI + Firebase Admin SDK
- **Database:** Firestore
- **Auth:** Firebase Authentication (Email/Password + Google Sign-In)

---

## Setup

### 1. Firebase project
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password + Google providers
3. Enable **Firestore Database**
4. Download a **Service Account key** (Project Settings → Service accounts → Generate new private key)

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in GOOGLE_APPLICATION_CREDENTIALS path to your service account JSON
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Fill in VITE_FIREBASE_* values from Firebase project settings
npm install
npm run dev
```

App runs at `http://localhost:5173`, API at `http://localhost:8000`.

---

## Running the backend as a module (if you get import errors)
```bash
# From repo root:
python -m uvicorn backend.main:app --reload
```

---

## Project Structure
```
habits/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── auth.py              # JWT verification
│   ├── firebase.py          # Admin SDK init
│   ├── routers/
│   │   ├── habits.py
│   │   ├── completions.py
│   │   └── monthly.py
│   ├── models/
│   │   ├── habit.py
│   │   ├── completion.py
│   │   └── monthly_log.py
│   └── requirements.txt
└── frontend/
    └── src/
        ├── lib/             # firebase.ts, api.ts
        ├── hooks/           # useHabits, useCompletions, useMonthlyLog
        ├── components/      # HabitGrid, HabitRow, DayCell, …
        └── pages/           # Login, Tracker
```
