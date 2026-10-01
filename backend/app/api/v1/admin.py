import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_admin
from app.models.enums import AnalysisStatus, OntologicalAxis
from app.models.orm import AnalysisEntryORM, DecisionEdgeORM, DecisionNodeORM, GraphVersionORM, UserProfileORM
from app.models.schemas import (
    AnalysisEntryRead,
    ApproveDraftRequest,
    DecisionEdgeRead,
    DecisionNodeRead,
    DraftDetail,
    DraftListItem,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _dominant_axis(entry: AnalysisEntryORM) -> OntologicalAxis:
    intensities = {
        OntologicalAxis.AXIS_1_BLOCKERS: entry.axis_1_blockers.get("intensity", 0.0),
        OntologicalAxis.AXIS_2_SHADOWS: entry.axis_2_shadows.get("intensity", 0.0),
        OntologicalAxis.AXIS_3_ENVIRONMENT: entry.axis_3_environment.get("intensity", 0.0),
        OntologicalAxis.AXIS_4_ALIGNMENT: entry.axis_4_alignment.get("intensity", 0.0),
        OntologicalAxis.AXIS_5_PATTERNS: entry.axis_5_patterns.get("intensity", 0.0),
    }
    return max(intensities, key=lambda axis: intensities[axis])


@router.get("/drafts", response_model=list[DraftListItem])
async def list_drafts(db: AsyncSession = Depends(get_db)) -> list[DraftListItem]:
    rows = await db.scalars(
        select(AnalysisEntryORM)
        .options(selectinload(AnalysisEntryORM.user_profile))
        .where(AnalysisEntryORM.status == AnalysisStatus.DRAFT)
        .order_by(AnalysisEntryORM.created_at.asc())
    )
    entries = rows.all()

    items: list[DraftListItem] = []
    for entry in entries:
        graph_version = await db.scalar(
            select(GraphVersionORM).where(GraphVersionORM.triggered_by_entry_id == entry.id)
        )
        if graph_version is None:
            continue
        items.append(
            DraftListItem(
                analysis_entry_id=entry.id,
                graph_version_id=graph_version.id,
                user_profile_id=entry.user_profile_id,
                user_display_name=entry.user_profile.display_name,
                created_at=entry.created_at,
                dominant_axis=_dominant_axis(entry),
                has_contradictions=len(entry.contradictions) > 0,
            )
        )
    return items


@router.get("/drafts/{entry_id}", response_model=DraftDetail)
async def get_draft_detail(entry_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> DraftDetail:
    entry = await db.get(AnalysisEntryORM, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft analysis entry not found.")

    graph_version = await db.scalar(
        select(GraphVersionORM).where(GraphVersionORM.triggered_by_entry_id == entry_id)
    )
    if graph_version is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No graph version was generated for this entry.")

    node_rows = await db.scalars(
        select(DecisionNodeORM).where(DecisionNodeORM.graph_version_id == graph_version.id)
    )
    edge_rows = await db.scalars(
        select(DecisionEdgeORM).where(DecisionEdgeORM.graph_version_id == graph_version.id)
    )

    return DraftDetail(
        analysis_entry=AnalysisEntryRead.model_validate(entry),
        graph_version_id=graph_version.id,
        nodes=[DecisionNodeRead.model_validate(n) for n in node_rows.all()],
        edges=[DecisionEdgeRead.model_validate(e) for e in edge_rows.all()],
    )


@router.put("/drafts/{entry_id}/approve", response_model=DraftDetail)
async def approve_draft(
    entry_id: uuid.UUID,
    payload: ApproveDraftRequest,
    db: AsyncSession = Depends(get_db),
) -> DraftDetail:
    entry = await db.get(AnalysisEntryORM, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft analysis entry not found.")
    if entry.status == AnalysisStatus.APPROVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "This draft has already been approved.")

    graph_version = await db.scalar(
        select(GraphVersionORM).where(GraphVersionORM.triggered_by_entry_id == entry_id)
    )
    if graph_version is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No graph version was generated for this entry.")

    for edit in payload.node_edits:
        node = await db.get(DecisionNodeORM, edit.node_id)
        if node is None or node.graph_version_id != graph_version.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Node {edit.node_id} does not belong to this draft."
            )
        update_data = edit.update.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            setattr(node, field_name, value)

    now = datetime.now(UTC)
    entry.status = AnalysisStatus.APPROVED
    entry.reviewed_by = payload.reviewer
    entry.reviewed_at = now
    entry.admin_notes = payload.admin_notes

    previously_active = await db.scalars(
        select(GraphVersionORM).where(
            GraphVersionORM.user_profile_id == entry.user_profile_id,
            GraphVersionORM.is_active.is_(True),
        )
    )
    for old_version in previously_active.all():
        old_version.is_active = False

    graph_version.status = AnalysisStatus.APPROVED
    graph_version.is_active = True
    graph_version.approved_by = payload.reviewer
    graph_version.approved_at = now

    user = await db.get(UserProfileORM, entry.user_profile_id)
    if user is not None:
        user.current_state_summary = entry.axis_1_blockers.get("summary")
        user.dominant_axis = _dominant_axis(entry).value

    await db.commit()

    node_rows = await db.scalars(
        select(DecisionNodeORM).where(DecisionNodeORM.graph_version_id == graph_version.id)
    )
    edge_rows = await db.scalars(
        select(DecisionEdgeORM).where(DecisionEdgeORM.graph_version_id == graph_version.id)
    )

    return DraftDetail(
        analysis_entry=AnalysisEntryRead.model_validate(entry),
        graph_version_id=graph_version.id,
        nodes=[DecisionNodeRead.model_validate(n) for n in node_rows.all()],
        edges=[DecisionEdgeRead.model_validate(e) for e in edge_rows.all()],
    )
