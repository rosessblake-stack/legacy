import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_graph_builder, get_ontology_service, get_speech_service
from app.models.enums import AnalysisStatus, EntrySourceType, NodeType
from app.models.orm import AnalysisEntryORM, DecisionEdgeORM, DecisionNodeORM, GraphVersionORM, UserProfileORM
from app.models.schemas import AnalyzeResponse, DecisionNodeRead
from app.services.graph_service import DraftGraph, GraphBuilder
from app.services.ontology_service import OntologyAnalysisService
from app.services.speech_service import SpeechTranscriptionService, TranscriptionError

router = APIRouter(prefix="/analyze", tags=["analyze"])

_LAYOUT_X = {"profile": 0.0, "present": 480.0, "future": 960.0}


def _assign_layout(draft_graph: DraftGraph) -> dict[str, tuple[float, float]]:
    positions: dict[str, tuple[float, float]] = {}
    past_nodes = [n for n in draft_graph.nodes if n.data.node_type == NodeType.PAST_ENTRY]
    future_nodes = [n for n in draft_graph.nodes if n.data.node_type == NodeType.FUTURE_PATH]

    for node in draft_graph.nodes:
        if node.data.node_type.value == "PROFILE_CARD":
            positions[node.key] = (_LAYOUT_X["profile"], 0.0)
        elif node.data.node_type.value == "PRESENT_BLOCK":
            positions[node.key] = (_LAYOUT_X["present"], 0.0)

    for index, node in enumerate(past_nodes):
        positions[node.key] = (-480.0 * (index + 1), 0.0)

    span = max(len(future_nodes) - 1, 1)
    for index, node in enumerate(future_nodes):
        y = (index - span / 2) * 220.0
        positions[node.key] = (_LAYOUT_X["future"], y)

    return positions


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_201_CREATED)
async def analyze_entry(
    user_id: uuid.UUID = Form(...),
    text: str | None = Form(default=None),
    audio: UploadFile | None = None,
    db: AsyncSession = Depends(get_db),
    ontology_service: OntologyAnalysisService = Depends(get_ontology_service),
    graph_builder: GraphBuilder = Depends(get_graph_builder),
    speech_service: SpeechTranscriptionService = Depends(get_speech_service),
) -> AnalyzeResponse:
    user = await db.get(UserProfileORM, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User profile not found.")

    if not text and audio is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide either 'text' or an 'audio' file.")

    if audio is not None:
        audio_bytes = await audio.read()
        try:
            transcription = await speech_service.transcribe(audio_bytes, audio.filename or "audio.webm")
        except TranscriptionError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
        raw_text = transcription.text
        source_type = EntrySourceType.AUDIO
    else:
        raw_text = text.strip()
        source_type = EntrySourceType.TEXT

    if not raw_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No usable text was extracted from the input.")

    analysis = await ontology_service.analyze(raw_text)

    entry = AnalysisEntryORM(
        user_profile_id=user_id,
        source_type=source_type,
        raw_text=raw_text,
        axis_1_blockers=analysis.axis_1_blockers.model_dump(mode="json"),
        axis_2_shadows=analysis.axis_2_shadows.model_dump(mode="json"),
        axis_3_environment=analysis.axis_3_environment.model_dump(mode="json"),
        axis_4_alignment=analysis.axis_4_alignment.model_dump(mode="json"),
        axis_5_patterns=analysis.axis_5_patterns.model_dump(mode="json"),
        contradictions=[c.model_dump(mode="json") for c in analysis.contradictions],
        socratic_reflections=analysis.socratic_reflections,
        status=AnalysisStatus.DRAFT,
    )
    db.add(entry)
    await db.flush()

    previous_active_version = await db.scalar(
        select(GraphVersionORM)
        .where(GraphVersionORM.user_profile_id == user_id, GraphVersionORM.is_active.is_(True))
        .order_by(GraphVersionORM.version_number.desc())
    )
    previous_present_nodes: list[DecisionNodeRead] = []
    if previous_active_version is not None:
        rows = await db.scalars(
            select(DecisionNodeORM).where(
                DecisionNodeORM.graph_version_id == previous_active_version.id,
                DecisionNodeORM.node_type == NodeType.PRESENT_BLOCK,
            )
        )
        previous_present_nodes = [DecisionNodeRead.model_validate(row) for row in rows]

    last_version_number = await db.scalar(
        select(GraphVersionORM.version_number)
        .where(GraphVersionORM.user_profile_id == user_id)
        .order_by(GraphVersionORM.version_number.desc())
    )
    next_version_number = (last_version_number or 0) + 1

    draft_graph = await graph_builder.build_draft_graph(
        analysis=analysis,
        entry_id=entry.id,
        entry_created_at=entry.created_at,
        source_type=source_type,
        previous_present_nodes=previous_present_nodes,
    )

    graph_version = GraphVersionORM(
        user_profile_id=user_id,
        triggered_by_entry_id=entry.id,
        version_number=next_version_number,
        status=AnalysisStatus.DRAFT,
        is_active=False,
    )
    db.add(graph_version)
    await db.flush()

    layout = _assign_layout(draft_graph)
    key_to_id: dict[str, uuid.UUID] = {}
    for draft_node in draft_graph.nodes:
        node_id = uuid.uuid4()
        key_to_id[draft_node.key] = node_id
        position_x, position_y = layout.get(draft_node.key, (draft_node.data.position_x, draft_node.data.position_y))
        db.add(
            DecisionNodeORM(
                id=node_id,
                user_profile_id=user_id,
                graph_version_id=graph_version.id,
                source_analysis_entry_id=draft_node.data.source_analysis_entry_id,
                node_type=draft_node.data.node_type,
                label=draft_node.data.label,
                time_horizon=draft_node.data.time_horizon,
                position_x=position_x,
                position_y=position_y,
                properties=draft_node.data.properties,
                socratic_recommendation=draft_node.data.socratic_recommendation,
                risk_level=draft_node.data.risk_level,
                emotional_impact=draft_node.data.emotional_impact,
            )
        )

    for draft_edge in draft_graph.edges:
        db.add(
            DecisionEdgeORM(
                graph_version_id=graph_version.id,
                source_node_id=key_to_id[draft_edge.source_key],
                target_node_id=key_to_id[draft_edge.target_key],
                relation_type=draft_edge.relation_type,
                weight=draft_edge.weight,
            )
        )

    await db.commit()

    return AnalyzeResponse(
        analysis_entry_id=entry.id,
        graph_version_id=graph_version.id,
        status=AnalysisStatus.DRAFT,
    )
