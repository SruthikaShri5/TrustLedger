from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.models.mongo_models import User

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


# ─── Pydantic Schemas ───────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = ""
    phone: Optional[str] = ""


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Helpers ────────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def user_to_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "account_frozen": user.account_frozen,
        "large_text": user.large_text,
        "high_contrast": user.high_contrast,
        "voice_mode": user.voice_mode,
        "simple_mode": user.simple_mode,
        "created_at": user.created_at.isoformat(),
    }


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await User.find_one(User.username == username)
    if user is None:
        raise credentials_exception
    return user


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/register")
async def register(user_data: UserCreate):
    # Check duplicates
    if await User.find_one(User.email == user_data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await User.find_one(User.username == user_data.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name or "",
        phone=user_data.phone or "",
    )
    await user.insert()

    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/login")
async def login(login_data: LoginRequest):
    user = await User.find_one(User.username == login_data.username)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)


@router.put("/settings")
async def update_settings(
    settings_data: dict,
    current_user: User = Depends(get_current_user),
):
    allowed = ["full_name", "phone", "large_text", "high_contrast", "voice_mode", "simple_mode"]
    for key, value in settings_data.items():
        if key in allowed:
            setattr(current_user, key, value)
    await current_user.save()
    return {"message": "Settings updated successfully", "user": user_to_dict(current_user)}


@router.post("/freeze-account")
async def freeze_account(current_user: User = Depends(get_current_user)):
    current_user.account_frozen = True
    await current_user.save()
    return {"message": "Account frozen successfully. Contact support to unfreeze."}


@router.post("/unfreeze-account")
async def unfreeze_account(current_user: User = Depends(get_current_user)):
    current_user.account_frozen = False
    await current_user.save()
    return {"message": "Account unfrozen successfully."}
