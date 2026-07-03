from fastapi import APIRouter, Depends, Query

from ..auth import get_current_uid
from ..firebase import get_db
from ..models.monthly_log import MonthlyLogCreate, MonthlyLogOut, MonthlyLogUpdate

router = APIRouter(prefix="/api/monthly-log", tags=["monthly-log"])

_EMPTY = MonthlyLogOut(
    month="",
    goal="",
    notes="",
    reflection_well="",
    reflection_improve="",
    reflection_proud="",
)


def _ref(db, uid: str, month: str):
    return db.collection("users").document(uid).collection("monthly_logs").document(month)


@router.get("", response_model=MonthlyLogOut)
def get_log(month: str = Query(..., description="YYYY-MM"), uid: str = Depends(get_current_uid)):
    db = get_db()
    doc = _ref(db, uid, month).get()
    if not doc.exists:
        return MonthlyLogOut(month=month)
    d = doc.to_dict()
    return MonthlyLogOut(
        month=month,
        goal=d.get("goal", ""),
        notes=d.get("notes", ""),
        reflection_well=d.get("reflection_well", ""),
        reflection_improve=d.get("reflection_improve", ""),
        reflection_proud=d.get("reflection_proud", ""),
    )


@router.post("", response_model=MonthlyLogOut, status_code=201)
def create_log(body: MonthlyLogCreate, uid: str = Depends(get_current_uid)):
    db = get_db()
    ref = _ref(db, uid, body.month)
    ref.set(body.model_dump())
    return MonthlyLogOut(**body.model_dump())


@router.patch("/{month}", response_model=MonthlyLogOut)
def update_log(month: str, body: MonthlyLogUpdate, uid: str = Depends(get_current_uid)):
    db = get_db()
    ref = _ref(db, uid, month)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ref.set(updates, merge=True)
    doc = ref.get()
    d = doc.to_dict() or {}
    return MonthlyLogOut(
        month=month,
        goal=d.get("goal", ""),
        notes=d.get("notes", ""),
        reflection_well=d.get("reflection_well", ""),
        reflection_improve=d.get("reflection_improve", ""),
        reflection_proud=d.get("reflection_proud", ""),
    )
