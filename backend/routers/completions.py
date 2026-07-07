from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_uid
from ..date_utils import is_weekday, period_bounds
from ..firebase import get_db
from ..models.completion import CompletionCreate, CompletionOut

router = APIRouter(tags=["completions"])


def _doc_to_completion(doc) -> CompletionOut:
    d = doc.to_dict()
    return CompletionOut(
        id=doc.id,
        habit_id=d["habit_id"],
        date=d["date"],
        created_at=d.get("created_at"),
    )


@router.post("/api/habits/{habit_id}/complete", response_model=CompletionOut, status_code=201)
def mark_complete(
    habit_id: str,
    body: CompletionCreate,
    uid: str = Depends(get_current_uid),
):
    db = get_db()
    completions_ref = db.collection("users").document(uid).collection("completions")
    # Idempotent: skip if already exists
    existing = completions_ref.where("habit_id", "==", habit_id).where("date", "==", body.date).limit(1).get()
    if existing:
        return _doc_to_completion(existing[0])

    habit_doc = db.collection("users").document(uid).collection("habits").document(habit_id).get()
    frequency = habit_doc.to_dict().get("frequency", "daily") if habit_doc.exists else "daily"

    if frequency == "weekly" and not is_weekday(body.date):
        raise HTTPException(
            status_code=422,
            detail="Este hábito solo se puede marcar de lunes a viernes.",
        )

    # Weekly habits allow a check on any weekday (Mon-Fri) in the same week —
    # only monthly enforces one check per period.
    bounds = period_bounds(frequency, body.date) if frequency == "monthly" else None
    if bounds:
        start, end = bounds
        clashing = (
            completions_ref.where("habit_id", "==", habit_id)
            .where("date", ">=", start)
            .where("date", "<=", end)
            .limit(1)
            .get()
        )
        if clashing:
            raise HTTPException(
                status_code=409,
                detail="Este hábito ya tiene un check en este período.",
            )

    now = datetime.now(timezone.utc)
    _, ref = completions_ref.add({"habit_id": habit_id, "date": body.date, "created_at": now})
    return _doc_to_completion(ref.get())


@router.delete("/api/habits/{habit_id}/complete", status_code=204)
def unmark_complete(
    habit_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    uid: str = Depends(get_current_uid),
):
    db = get_db()
    completions_ref = db.collection("users").document(uid).collection("completions")
    docs = completions_ref.where("habit_id", "==", habit_id).where("date", "==", date).stream()
    for doc in docs:
        doc.reference.delete()


@router.get("/api/completions", response_model=list[CompletionOut])
def list_completions(
    month: str = Query(..., description="YYYY-MM"),
    uid: str = Depends(get_current_uid),
):
    db = get_db()
    completions_ref = db.collection("users").document(uid).collection("completions")
    # Filter by month prefix
    start = f"{month}-01"
    end = f"{month}-32"
    docs = completions_ref.where("date", ">=", start).where("date", "<=", end).stream()
    return [_doc_to_completion(doc) for doc in docs]
