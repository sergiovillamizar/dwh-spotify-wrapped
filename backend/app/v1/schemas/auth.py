from pydantic import BaseModel


class LoginResponse(BaseModel):
    auth_url: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class JWTPayload(BaseModel):
    sub: str
    user_id: int
    exp: int
