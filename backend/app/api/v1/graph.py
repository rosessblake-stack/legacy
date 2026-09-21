import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.orm import DecisionEdgeORM, DecisionNodeORM, GraphVersionORM, UserProfileORM
from app.models.schemas import DecisionEdgeRead, DecisionNodeRead, GraphResponse, UserProfileRead

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{user_id}", response_model=GraphResponse)
async def get_active_graph(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> GraphResponse:
    user = await db.get(UserProfileORM, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User profile not found.")

    active_version = await db.scalar(
        select(GraphVersionORM).where(
            GraphVersionORM.user_profile_id == user_id, GraphVersionORM.is_active.is_(True)
        )
    )

    version_history_rows = await db.scalars(
        select(GraphVersionORM.id)
        .where(GraphVersionORM.user_profile_id == user_id)
        .order_by(GraphVersionORM.version_number.asc())
    )
    version_history = list(version_history_rows.all())

    if active_version is None:
        return GraphResponse(
            user_profile=UserProfileRead.model_validate(user),
            active_graph_version_id=None,
            nodes=[],
            edges=[],
            version_history=version_history,
        )

    node_rows = await db.scalars(
        select(DecisionNodeORM).where(DecisionNodeORM.graph_version_id == active_version.id)
    )
    edge_rows = await db.scalars(
        select(DecisionEdgeORM).where(DecisionEdgeORM.graph_version_id == active_version.id)
    )

    return GraphResponse(
        user_profile=UserProfileRead.model_validate(user),
        active_graph_version_id=active_version.id,
        nodes=[DecisionNodeRead.model_validate(n) for n in node_rows.all()],
        edges=[DecisionEdgeRead.model_validate(e) for e in edge_rows.all()],
        version_history=version_history,
    )
