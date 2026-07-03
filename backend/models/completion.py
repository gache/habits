from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompletionCreate(BaseModel):
    date: str  # "YYYY-MM-DD"


class CompletionOut(BaseModel):
    id: str
    habit_id: str
    date: str
    created_at: Optional[datetime] = None
