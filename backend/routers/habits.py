from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_uid
from ..firebase import get_db
from ..models.habit import HabitCreate, HabitOut, HabitUpdate

router = APIRouter(prefix="/api/habits", tags=["habits"])

DEFAULT_HABITS = [
    {"icon": "💧", "name": "DRINK WATER",          "description": "8 GLASSES",      "color": "#a8d8ea", "order": 1},
    {"icon": "🏃", "name": "EXERCISE",              "description": "30 MINUTES",     "color": "#b8e0b8", "order": 2},
    {"icon": "🧘", "name": "MEDITATE",              "description": "15 MINUTES",     "color": "#d4a8d4", "order": 3},
    {"icon": "📖", "name": "READ",                  "description": "20 MINUTES",     "color": "#f0c8a0", "order": 4},
    {"icon": "📝", "name": "JOURNAL",               "description": "DAILY",          "color": "#f0e0a0", "order": 5},
    {"icon": "🛏️","name": "SLEEP EARLY",            "description": "7-8 HOURS",      "color": "#a8c8e8", "order": 6},
    {"icon": "🥗", "name": "EAT HEALTHY MEALS",     "description": None,             "color": "#b8d8a8", "order": 7},
    {"icon": "📋", "name": "PLAN YOUR DAY",         "description": "EVERY MORNING",  "color": "#e8c8a8", "order": 8},
    {"icon": "☀️", "name": "GET SUNLIGHT",          "description": "15 MINUTES",     "color": "#f8e0a0", "order": 9},
    {"icon": "📵", "name": "LIMIT SCREEN TIME",     "description": "LESS IS BEST",   "color": "#f0b8b8", "order": 10},
    {"icon": "💡", "name": "LEARN SOMETHING NEW",   "description": None,             "color": "#c8d8f0", "order": 11},
    {"icon": "❤️", "name": "BE GRATEFUL",           "description": "DAILY",          "color": "#f0b8c8", "order": 12},
    {"icon": "🧹", "name": "CLEAN / TIDY SOMETHING","description": None,             "color": "#c8e8d8", "order": 13},
    {"icon": "💰", "name": "SAVE MONEY",            "description": "DAILY",          "color": "#d8f0b8", "order": 14},
    {"icon": "💬", "name": "CONNECT WITH LOVED ONES","description": None,            "color": "#e8c8f0", "order": 15},
    {"icon": "✈️", "name": "NO SPEND DAY",          "description": "WEEKLY",         "color": "#c8e0f0", "order": 16, "frequency": "weekly"},
]


def _seed_habits(db, uid: str):
    habits_ref = db.collection("users").document(uid).collection("habits")
    now = datetime.now(timezone.utc)
    for h in DEFAULT_HABITS:
        habits_ref.add({
            "name": h["name"],
            "description": h.get("description"),
            "frequency": h.get("frequency", "daily"),
            "active": True,
            "icon": h["icon"],
            "color": h["color"],
            "order": h["order"],
            "created_at": now,
            "updated_at": now,
        })


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
    )


@router.get("", response_model=list[HabitOut])
def list_habits(
    active: Optional[bool] = None,
    uid: str = Depends(get_current_uid),
):
    db = get_db()
    habits_ref = db.collection("users").document(uid).collection("habits")

    # Seed defaults on first visit
    if not habits_ref.limit(1).get():
        _seed_habits(db, uid)

    query = habits_ref.order_by("order")
    if active is not None:
        query = habits_ref.where("active", "==", active).order_by("order")

    return [_doc_to_habit(doc) for doc in query.stream()]


@router.get("/{habit_id}", response_model=HabitOut)
def get_habit(habit_id: str, uid: str = Depends(get_current_uid)):
    db = get_db()
    doc = db.collection("users").document(uid).collection("habits").document(habit_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Habit not found")
    return _doc_to_habit(doc)


@router.post("", response_model=HabitOut, status_code=201)
def create_habit(body: HabitCreate, uid: str = Depends(get_current_uid)):
    db = get_db()
    now = datetime.now(timezone.utc)
    data = {**body.model_dump(), "created_at": now, "updated_at": now}
    _, ref = db.collection("users").document(uid).collection("habits").add(data)
    doc = ref.get()
    return _doc_to_habit(doc)


@router.patch("/{habit_id}", response_model=HabitOut)
def update_habit(habit_id: str, body: HabitUpdate, uid: str = Depends(get_current_uid)):
    db = get_db()
    ref = db.collection("users").document(uid).collection("habits").document(habit_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Habit not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    ref.update(updates)
    return _doc_to_habit(ref.get())


@router.delete("/{habit_id}", status_code=204)
def delete_habit(habit_id: str, uid: str = Depends(get_current_uid)):
    db = get_db()
    ref = db.collection("users").document(uid).collection("habits").document(habit_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Habit not found")
    ref.delete()
