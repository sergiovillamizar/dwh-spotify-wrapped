from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    user_id: int
    spotify_id: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    followers: Optional[int] = None
    product: Optional[str] = None
    loaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
