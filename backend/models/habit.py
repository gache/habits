from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"  # "daily" | "weekly" | "monthly"
    active: bool = True
    icon: str = "⭐"
    color: str = "#d4c4a8"
    order: int = 0


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    active: Optional[bool] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None


class HabitOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    frequency: str
    active: bool
    icon: str
    color: str
    order: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
