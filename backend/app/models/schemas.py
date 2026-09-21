import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    AnalysisStatus,
    CapitalSin,
    EdgeRelation,
    EntrySourceType,
    InertiaType,
    NodeType,
    OntologicalAxis,
    PainOrigin,
    PathType,
    RiskLevel,
    TimeHorizon,
)

# --------------------------------------------------------------------------
# Axis 1 — Problemas reales actuales y bloqueos inmediatos
# Grounded in JTBD (Christensen/Ulwick): dolor funcional / emocional / social,
# anclado a un momento específico vivido, clasificado por origen.
# --------------------------------------------------------------------------


class Axis1Blockers(BaseModel):
    summary: str = Field(description="Síntesis del bloqueo real, en tono descriptivo, no imperativo.")
    intensity: float = Field(ge=0.0, le=1.0)
    pain_functional: str = Field(description="Qué literalmente no funciona o exige demasiado esfuerzo.")
    pain_emotional: str = Field(description="Qué se siente al no resolverlo (ansiedad, miedo, culpa).")
    pain_social: str = Field(description="Cómo se percibe, ante otros, no resolverlo.")
    pain_origin: PainOrigin
    anchored_moment: str = Field(description="El momento específico y fechado narrado por la persona.")
    evidence_quotes: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Axis 2 — Motivaciones subyacentes, sombras y miedos centrales
# Grounded in the 7 pecados capitales (modern expressions) + virtud contraria.
# --------------------------------------------------------------------------


class Axis2Shadows(BaseModel):
    summary: str
    intensity: float = Field(ge=0.0, le=1.0)
    dominant_sin: CapitalSin
    sin_intensity_map: dict[CapitalSin, float] = Field(
        description="Puntuación 0-1 de presencia de cada uno de los 7 pecados capitales."
    )
    opposing_virtue_practice: str = Field(
        description="Práctica concreta de la virtud contraria al pecado dominante, no solo la advertencia."
    )
    impostor_signal: bool = Field(
        description="Señal del síndrome del impostor invertido (soberbia: dejar de pedir feedback)."
    )
    champagne_moment: str | None = Field(
        default=None, description="El logro personal, no de negocio, que realmente motiva a la persona."
    )
    evidence_quotes: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Axis 3 — Dinámica del entorno y restricciones externas
# Grounded in Cialdini (7 principios) + STEPPS de Jonah Berger.
# --------------------------------------------------------------------------


class Axis3Environment(BaseModel):
    summary: str
    intensity: float = Field(ge=0.0, le=1.0)
    cialdini_principles_present: list[
        Literal[
            "reciprocidad",
            "compromiso_consistencia",
            "prueba_social",
            "autoridad",
            "simpatia",
            "escasez",
            "unidad",
        ]
    ] = Field(default_factory=list)
    stepps_factors_present: list[
        Literal["social_currency", "triggers", "emotion", "public", "practical_value", "stories"]
    ] = Field(default_factory=list)
    reaction_pattern: str = Field(description="Cómo responde el entorno real a las acciones de la persona.")
    controversy_signal: bool = Field(
        description="Si el entorno reacciona más por controversia/posicionamiento que por acuerdo."
    )
    external_constraints: list[str] = Field(default_factory=list)
    evidence_quotes: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Axis 4 — Alineación del deseo real vs. objetivos declarados
# Grounded in possible selves theory (Markus & Nurius): yo esperado / temido / esperable.
# --------------------------------------------------------------------------


class Axis4Alignment(BaseModel):
    summary: str
    intensity: float = Field(ge=0.0, le=1.0)
    hoped_self: str = Field(description="El yo esperado (hoped-for self).")
    feared_self: str = Field(description="El yo temido (feared self) — casi nunca dicho explícitamente.")
    expected_self: str = Field(description="El yo esperable, lo que realistamente cree que será.")
    declared_goal: str = Field(description="El objetivo que la persona dice perseguir.")
    real_desire_inferred: str = Field(description="El deseo real inferido, leyendo entre líneas.")
    contradiction_detected: bool
    contradiction_description: str | None = None
    aspirational_group: str | None = Field(
        default=None, description="Referente o grupo aspiracional con el que la persona se mide."
    )
    evidence_quotes: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Axis 5 — Patrones de comportamiento e inercia de éxito/acción
# Grounded in Case-Based Reasoning + árboles de decisión: determinadores, bucles.
# --------------------------------------------------------------------------


class Axis5Patterns(BaseModel):
    summary: str
    intensity: float = Field(ge=0.0, le=1.0)
    behavioral_loop: str = Field(description="El bucle histórico identificado (qué se repite y cuándo).")
    determinators: list[str] = Field(
        description="Los atributos que realmente importan para reconocer este patrón, no los ruidosos."
    )
    inertia_type: InertiaType
    similar_past_case_hint: str | None = Field(
        default=None, description="Referencia a un caso pasado propio con estructura similar."
    )
    evidence_quotes: list[str] = Field(default_factory=list)


class ContradictionFinding(BaseModel):
    axes_involved: list[OntologicalAxis]
    description: str
    socratic_reflection: str = Field(
        description="Pregunta socrática, nunca una instrucción imperativa."
    )


class AnalysisResult(BaseModel):
    """Full 5-axis structured output of the ontology analysis pipeline."""

    axis_1_blockers: Axis1Blockers
    axis_2_shadows: Axis2Shadows
    axis_3_environment: Axis3Environment
    axis_4_alignment: Axis4Alignment
    axis_5_patterns: Axis5Patterns
    contradictions: list[ContradictionFinding] = Field(default_factory=list)
    socratic_reflections: list[str] = Field(default_factory=list)


class AnalysisEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_profile_id: uuid.UUID
    source_type: EntrySourceType
    raw_text: str
    audio_asset_url: str | None
    axis_1_blockers: Axis1Blockers
    axis_2_shadows: Axis2Shadows
    axis_3_environment: Axis3Environment
    axis_4_alignment: Axis4Alignment
    axis_5_patterns: Axis5Patterns
    contradictions: list[ContradictionFinding]
    socratic_reflections: list[str]
    status: AnalysisStatus
    reviewed_by: str | None
    reviewed_at: datetime | None
    admin_notes: str | None
    created_at: datetime


# --------------------------------------------------------------------------
# Node / edge property payloads
# --------------------------------------------------------------------------


class ProfileCardProperties(BaseModel):
    headline: str
    key_revelation: str
    axis_summary: dict[OntologicalAxis, str]
    axis_intensity: dict[OntologicalAxis, float]


class PastEntryProperties(BaseModel):
    entry_date: datetime
    source_type: EntrySourceType
    raw_summary: str
    dominant_axis: OntologicalAxis


class PresentBlockProperties(BaseModel):
    blockers: list[str]
    dominant_sin: CapitalSin
    has_active_contradiction: bool


class FuturePathProperties(BaseModel):
    path_type: PathType
    based_on_axis: list[OntologicalAxis]
    supporting_evidence: list[str]


class DecisionNodeCreate(BaseModel):
    node_type: NodeType
    label: str
    time_horizon: TimeHorizon
    position_x: float = 0.0
    position_y: float = 0.0
    properties: dict
    socratic_recommendation: str | None = None
    risk_level: RiskLevel | None = None
    emotional_impact: str | None = None
    source_analysis_entry_id: uuid.UUID | None = None


class DecisionNodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    graph_version_id: uuid.UUID
    node_type: NodeType
    label: str
    time_horizon: TimeHorizon
    position_x: float
    position_y: float
    properties: dict
    socratic_recommendation: str | None
    risk_level: RiskLevel | None
    emotional_impact: str | None
    created_at: datetime


class DecisionNodeUpdate(BaseModel):
    label: str | None = None
    position_x: float | None = None
    position_y: float | None = None
    properties: dict | None = None
    socratic_recommendation: str | None = None
    risk_level: RiskLevel | None = None
    emotional_impact: str | None = None


class DecisionEdgeCreate(BaseModel):
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    relation_type: EdgeRelation
    weight: float = 1.0


class DecisionEdgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    graph_version_id: uuid.UUID
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    relation_type: EdgeRelation
    weight: float


# --------------------------------------------------------------------------
# API request/response contracts
# --------------------------------------------------------------------------


class UserProfileCreate(BaseModel):
    display_name: str
    email: str


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    email: str
    current_state_summary: str | None
    dominant_axis: str | None
    created_at: datetime
    updated_at: datetime


class AnalyzeTextRequest(BaseModel):
    user_id: uuid.UUID
    text: str = Field(min_length=1)


class AnalyzeResponse(BaseModel):
    analysis_entry_id: uuid.UUID
    graph_version_id: uuid.UUID
    status: AnalysisStatus


class DraftListItem(BaseModel):
    analysis_entry_id: uuid.UUID
    graph_version_id: uuid.UUID
    user_profile_id: uuid.UUID
    user_display_name: str
    created_at: datetime
    dominant_axis: OntologicalAxis
    has_contradictions: bool


class DraftDetail(BaseModel):
    analysis_entry: AnalysisEntryRead
    graph_version_id: uuid.UUID
    nodes: list[DecisionNodeRead]
    edges: list[DecisionEdgeRead]


class NodeEditPayload(BaseModel):
    node_id: uuid.UUID
    update: DecisionNodeUpdate


class ApproveDraftRequest(BaseModel):
    reviewer: str = Field(description="Identificador del administrador que aprueba.")
    admin_notes: str | None = None
    node_edits: list[NodeEditPayload] = Field(default_factory=list)


class GraphResponse(BaseModel):
    user_profile: UserProfileRead
    active_graph_version_id: uuid.UUID | None
    nodes: list[DecisionNodeRead]
    edges: list[DecisionEdgeRead]
    version_history: list[uuid.UUID]
