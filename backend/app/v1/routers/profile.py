"""
app/v1/routers/profile.py
Profile endpoints.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from fastapi import APIRouter, Depends

from app.core.database import DimUser
from app.v1.dependencies import get_current_user
from app.v1.schemas.users import UserResponse

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: DimUser = Depends(get_current_user)) -> DimUser:
    return current_user
