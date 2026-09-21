from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.orm import UserProfileORM
from app.models.schemas import UserProfileCreate, UserProfileRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserProfileRead, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    payload: UserProfileCreate, db: AsyncSession = Depends(get_db)
) -> UserProfileORM:
    existing = await db.scalar(select(UserProfileORM).where(UserProfileORM.email == payload.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists.")

    user = UserProfileORM(display_name=payload.display_name, email=payload.email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserProfileRead)
async def get_user_profile(user_id: str, db: AsyncSession = Depends(get_db)) -> UserProfileORM:
    user = await db.get(UserProfileORM, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User profile not found.")
    return user
