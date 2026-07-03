from pydantic import BaseModel
from typing import Optional


class MonthlyLogCreate(BaseModel):
    month: str  # "YYYY-MM"
    goal: str = ""
    notes: str = ""
    reflection_well: str = ""
    reflection_improve: str = ""
    reflection_proud: str = ""


class MonthlyLogUpdate(BaseModel):
    goal: Optional[str] = None
    notes: Optional[str] = None
    reflection_well: Optional[str] = None
    reflection_improve: Optional[str] = None
    reflection_proud: Optional[str] = None


class MonthlyLogOut(BaseModel):
    month: str
    goal: str = ""
    notes: str = ""
    reflection_well: str = ""
    reflection_improve: str = ""
    reflection_proud: str = ""
