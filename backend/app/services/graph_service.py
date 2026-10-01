from dataclasses import dataclass, field
from datetime import datetime

from app.models.enums import (
    EdgeRelation,
    EntrySourceType,
    NodeType,
    OntologicalAxis,
    PathType,
    RiskLevel,
    TimeHorizon,
)
from app.models.schemas import (
    AnalysisResult,
    DecisionNodeCreate,
    DecisionNodeRead,
    FuturePathProperties,
    PastEntryProperties,
    PresentBlockProperties,
    ProfileCardProperties,
)
from app.services.guardrail_service import SocraticGuardrail

_AXIS_SHORT_LABELS: dict[OntologicalAxis, str] = {
    OntologicalAxis.AXIS_1_BLOCKERS: "Bloqueos",
    OntologicalAxis.AXIS_2_SHADOWS: "Sombras",
    OntologicalAxis.AXIS_3_ENVIRONMENT: "Entorno",
    OntologicalAxis.AXIS_4_ALIGNMENT: "Alineación",
    OntologicalAxis.AXIS_5_PATTERNS: "Patrones",
}


@dataclass(frozen=True)
class DraftNode:
    key: str
    data: DecisionNodeCreate


@dataclass(frozen=True)
class DraftEdge:
    source_key: str
    target_key: str
    relation_type: EdgeRelation
    weight: float = 1.0


@dataclass(frozen=True)
class DraftGraph:
    nodes: list[DraftNode] = field(default_factory=list)
    edges: list[DraftEdge] = field(default_factory=list)


class GraphBuilder:
    """Turns a fresh 5-axis AnalysisResult, plus the user's previous
    PRESENT_BLOCK nodes (which become history), into the full node/edge
    graph for a new DRAFT graph version — implementing the
    case-based-reasoning idea that every resolved entry is retained and
    feeds the next diagnosis."""

    def __init__(self, guardrail: SocraticGuardrail) -> None:
        self._guardrail = guardrail

    async def build_draft_graph(
        self,
        analysis: AnalysisResult,
        entry_id,
        entry_created_at: datetime,
        source_type: EntrySourceType,
        previous_present_nodes: list[DecisionNodeRead],
    ) -> DraftGraph:
        nodes: list[DraftNode] = []
        edges: list[DraftEdge] = []

        profile_node = self._build_profile_card(analysis, entry_id)
        nodes.append(profile_node)

        past_nodes = self._carry_forward_past_nodes(previous_present_nodes)
        nodes.extend(past_nodes)

        present_node = self._build_present_block(analysis, entry_id, entry_created_at, source_type)
        nodes.append(present_node)

        edges.append(DraftEdge(profile_node.key, present_node.key, EdgeRelation.REVEALS))
        for past_node in past_nodes:
            edges.append(DraftEdge(past_node.key, present_node.key, EdgeRelation.LEADS_TO))

        recommended_node = await self._build_recommended_path(analysis, entry_id)
        nodes.append(recommended_node)
        edges.append(DraftEdge(present_node.key, recommended_node.key, EdgeRelation.LEADS_TO))

        alt_nodes = await self._build_alternative_paths(analysis, entry_id)
        for alt_node in alt_nodes:
            nodes.append(alt_node)
            edges.append(DraftEdge(present_node.key, alt_node.key, EdgeRelation.OPENS_GATE))

        if analysis.axis_4_alignment.contradiction_detected and alt_nodes:
            edges.append(
                DraftEdge(recommended_node.key, alt_nodes[0].key, EdgeRelation.CONTRADICTS)
            )

        return DraftGraph(nodes=nodes, edges=edges)

    def _build_profile_card(self, analysis: AnalysisResult, entry_id) -> DraftNode:
        axis_summary = {
            OntologicalAxis.AXIS_1_BLOCKERS: analysis.axis_1_blockers.summary,
            OntologicalAxis.AXIS_2_SHADOWS: analysis.axis_2_shadows.summary,
            OntologicalAxis.AXIS_3_ENVIRONMENT: analysis.axis_3_environment.summary,
            OntologicalAxis.AXIS_4_ALIGNMENT: analysis.axis_4_alignment.summary,
            OntologicalAxis.AXIS_5_PATTERNS: analysis.axis_5_patterns.summary,
        }
        axis_intensity = {
            OntologicalAxis.AXIS_1_BLOCKERS: analysis.axis_1_blockers.intensity,
            OntologicalAxis.AXIS_2_SHADOWS: analysis.axis_2_shadows.intensity,
            OntologicalAxis.AXIS_3_ENVIRONMENT: analysis.axis_3_environment.intensity,
            OntologicalAxis.AXIS_4_ALIGNMENT: analysis.axis_4_alignment.intensity,
            OntologicalAxis.AXIS_5_PATTERNS: analysis.axis_5_patterns.intensity,
        }
        dominant_axis = max(axis_intensity, key=lambda axis: axis_intensity[axis])
        properties = ProfileCardProperties(
            headline=analysis.axis_4_alignment.hoped_self,
            key_revelation=axis_summary[dominant_axis],
            axis_summary=axis_summary,
            axis_intensity=axis_intensity,
        )
        data = DecisionNodeCreate(
            node_type=NodeType.PROFILE_CARD,
            label="Perfil ontológico",
            time_horizon=TimeHorizon.PRESENT,
            properties=properties.model_dump(mode="json"),
            source_analysis_entry_id=entry_id,
        )
        return DraftNode(key="profile", data=data)

    def _carry_forward_past_nodes(self, previous_present_nodes: list[DecisionNodeRead]) -> list[DraftNode]:
        carried: list[DraftNode] = []
        for index, node in enumerate(previous_present_nodes):
            props = node.properties
            past_properties = PastEntryProperties(
                entry_date=node.created_at,
                source_type=EntrySourceType(props.get("source_type", EntrySourceType.TEXT.value)),
                raw_summary=props.get("raw_summary", node.label),
                dominant_axis=OntologicalAxis(props.get("dominant_axis", OntologicalAxis.AXIS_1_BLOCKERS.value)),
            )
            data = DecisionNodeCreate(
                node_type=NodeType.PAST_ENTRY,
                label=node.label,
                time_horizon=TimeHorizon.PAST,
                position_x=node.position_x,
                position_y=node.position_y,
                properties=past_properties.model_dump(mode="json"),
            )
            carried.append(DraftNode(key=f"past-{index}-{node.id}", data=data))
        return carried

    def _build_present_block(
        self,
        analysis: AnalysisResult,
        entry_id,
        entry_created_at: datetime,
        source_type: EntrySourceType,
    ) -> DraftNode:
        properties = PresentBlockProperties(
            blockers=[
                analysis.axis_1_blockers.pain_functional,
                analysis.axis_1_blockers.pain_emotional,
                analysis.axis_1_blockers.pain_social,
            ],
            dominant_sin=analysis.axis_2_shadows.dominant_sin,
            has_active_contradiction=analysis.axis_4_alignment.contradiction_detected,
        )
        raw_summary_properties = properties.model_dump(mode="json")
        raw_summary_properties["raw_summary"] = analysis.axis_1_blockers.anchored_moment
        raw_summary_properties["source_type"] = source_type.value
        raw_summary_properties["dominant_axis"] = OntologicalAxis.AXIS_1_BLOCKERS.value

        data = DecisionNodeCreate(
            node_type=NodeType.PRESENT_BLOCK,
            label=analysis.axis_1_blockers.anchored_moment[:120],
            time_horizon=TimeHorizon.PRESENT,
            properties=raw_summary_properties,
            source_analysis_entry_id=entry_id,
        )
        return DraftNode(key="present", data=data)

    async def _build_recommended_path(self, analysis: AnalysisResult, entry_id) -> DraftNode:
        axis_4 = analysis.axis_4_alignment
        axis_5 = analysis.axis_5_patterns
        raw_recommendation = (
            f"Este camino se acerca a '{axis_4.hoped_self}' rompiendo el bucle de "
            f"'{axis_5.behavioral_loop}'."
        )
        socratic = await self._guardrail.enforce(raw_recommendation, "Eje 4/5 (alineación y patrones)")

        properties = FuturePathProperties(
            path_type=PathType.RECOMMENDED,
            based_on_axis=[OntologicalAxis.AXIS_4_ALIGNMENT, OntologicalAxis.AXIS_5_PATTERNS],
            supporting_evidence=[axis_4.real_desire_inferred, axis_5.behavioral_loop],
        )
        risk_level = RiskLevel.MEDIUM if axis_5.inertia_type.value == "exito" else RiskLevel.LOW

        data = DecisionNodeCreate(
            node_type=NodeType.FUTURE_PATH,
            label=f"Camino recomendado hacia {axis_4.hoped_self}"[:120],
            time_horizon=TimeHorizon.FUTURE,
            properties=properties.model_dump(mode="json"),
            socratic_recommendation=socratic,
            risk_level=risk_level,
            emotional_impact=f"Tensión con el yo temido: {axis_4.feared_self}"[:300],
            source_analysis_entry_id=entry_id,
        )
        return DraftNode(key="path-recommended", data=data)

    async def _build_alternative_paths(self, analysis: AnalysisResult, entry_id) -> list[DraftNode]:
        axis_2 = analysis.axis_2_shadows
        axis_3 = analysis.axis_3_environment
        alt_nodes: list[DraftNode] = []

        virtue_raw = (
            f"Puerta alternativa: entrenar la virtud contraria a {axis_2.dominant_sin.value} — "
            f"{axis_2.opposing_virtue_practice}"
        )
        virtue_socratic = await self._guardrail.enforce(virtue_raw, "Eje 2 (sombras)")
        virtue_properties = FuturePathProperties(
            path_type=PathType.ALTERNATIVE_GATE,
            based_on_axis=[OntologicalAxis.AXIS_2_SHADOWS],
            supporting_evidence=[axis_2.opposing_virtue_practice],
        )
        alt_nodes.append(
            DraftNode(
                key="path-alt-virtue",
                data=DecisionNodeCreate(
                    node_type=NodeType.FUTURE_PATH,
                    label=f"Puerta alternativa: virtud contraria a {axis_2.dominant_sin.value}"[:120],
                    time_horizon=TimeHorizon.FUTURE,
                    properties=virtue_properties.model_dump(mode="json"),
                    socratic_recommendation=virtue_socratic,
                    risk_level=RiskLevel.LOW,
                    emotional_impact=f"Riesgo de sombra activa: {axis_2.dominant_sin.value}"[:300],
                    source_analysis_entry_id=entry_id,
                ),
            )
        )

        if axis_3.cialdini_principles_present or axis_3.stepps_factors_present:
            mechanisms = ", ".join(axis_3.cialdini_principles_present + axis_3.stepps_factors_present)
            env_raw = f"Puerta alternativa: apoyarse en cómo reacciona el entorno vía {mechanisms}."
            env_socratic = await self._guardrail.enforce(env_raw, "Eje 3 (entorno)")
            env_properties = FuturePathProperties(
                path_type=PathType.ALTERNATIVE_GATE,
                based_on_axis=[OntologicalAxis.AXIS_3_ENVIRONMENT],
                supporting_evidence=axis_3.cialdini_principles_present + axis_3.stepps_factors_present,
            )
            alt_nodes.append(
                DraftNode(
                    key="path-alt-environment",
                    data=DecisionNodeCreate(
                        node_type=NodeType.FUTURE_PATH,
                        label="Puerta alternativa: apalancar el entorno"[:120],
                        time_horizon=TimeHorizon.FUTURE,
                        properties=env_properties.model_dump(mode="json"),
                        socratic_recommendation=env_socratic,
                        risk_level=RiskLevel.MEDIUM if axis_3.controversy_signal else RiskLevel.LOW,
                        emotional_impact="Expone la acción al juicio público del entorno"[:300],
                        source_analysis_entry_id=entry_id,
                    ),
                )
            )

        return alt_nodes
