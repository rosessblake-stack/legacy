import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.config import get_settings
from app.core.database import Base
from app.models.enums import AnalysisStatus, EntrySourceType, NodeType

settings = get_settings()


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class UserProfileORM(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = _uuid_pk()
    display_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    current_state_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    dominant_axis: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    analysis_entries: Mapped[list["AnalysisEntryORM"]] = relationship(
        back_populates="user_profile", cascade="all, delete-orphan"
    )
    decision_nodes: Mapped[list["DecisionNodeORM"]] = relationship(
        back_populates="user_profile", cascade="all, delete-orphan"
    )
    graph_versions: Mapped[list["GraphVersionORM"]] = relationship(
        back_populates="user_profile", cascade="all, delete-orphan"
    )


class AnalysisEntryORM(Base):
    __tablename__ = "analysis_entries"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[EntrySourceType] = mapped_column(String(16))
    raw_text: Mapped[str] = mapped_column(Text)
    audio_asset_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    axis_1_blockers: Mapped[dict] = mapped_column(JSON)
    axis_2_shadows: Mapped[dict] = mapped_column(JSON)
    axis_3_environment: Mapped[dict] = mapped_column(JSON)
    axis_4_alignment: Mapped[dict] = mapped_column(JSON)
    axis_5_patterns: Mapped[dict] = mapped_column(JSON)

    contradictions: Mapped[list] = mapped_column(JSON, default=list)
    socratic_reflections: Mapped[list] = mapped_column(JSON, default=list)

    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(settings.embedding_dimensions), nullable=True
    )

    status: Mapped[AnalysisStatus] = mapped_column(String(16), default=AnalysisStatus.DRAFT)
    reviewed_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    user_profile: Mapped["UserProfileORM"] = relationship(back_populates="analysis_entries")

    __table_args__ = (Index("ix_analysis_entries_user_status", "user_profile_id", "status"),)


class DecisionNodeORM(Base):
    __tablename__ = "decision_nodes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True
    )
    graph_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("graph_versions.id", ondelete="CASCADE"), index=True
    )
    source_analysis_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_entries.id", ondelete="SET NULL"), nullable=True
    )

    node_type: Mapped[NodeType] = mapped_column(String(32))
    label: Mapped[str] = mapped_column(String(300))
    time_horizon: Mapped[str] = mapped_column(String(16))
    position_x: Mapped[float] = mapped_column(default=0.0)
    position_y: Mapped[float] = mapped_column(default=0.0)

    properties: Mapped[dict] = mapped_column(JSON, default=dict)
    socratic_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(16), nullable=True)
    emotional_impact: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user_profile: Mapped["UserProfileORM"] = relationship(back_populates="decision_nodes")
    graph_version: Mapped["GraphVersionORM"] = relationship(back_populates="nodes")
    outgoing_edges: Mapped[list["DecisionEdgeORM"]] = relationship(
        back_populates="source_node",
        foreign_keys="DecisionEdgeORM.source_node_id",
        cascade="all, delete-orphan",
    )


class DecisionEdgeORM(Base):
    __tablename__ = "decision_edges"

    id: Mapped[uuid.UUID] = _uuid_pk()
    graph_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("graph_versions.id", ondelete="CASCADE"), index=True
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decision_nodes.id", ondelete="CASCADE")
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decision_nodes.id", ondelete="CASCADE")
    )
    relation_type: Mapped[str] = mapped_column(String(32))
    weight: Mapped[float] = mapped_column(default=1.0)

    graph_version: Mapped["GraphVersionORM"] = relationship(back_populates="edges")
    source_node: Mapped["DecisionNodeORM"] = relationship(
        back_populates="outgoing_edges", foreign_keys=[source_node_id]
    )


class GraphVersionORM(Base):
    __tablename__ = "graph_versions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True
    )
    triggered_by_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_entries.id", ondelete="SET NULL"), nullable=True
    )
    version_number: Mapped[int] = mapped_column(default=1)
    status: Mapped[AnalysisStatus] = mapped_column(String(16), default=AnalysisStatus.DRAFT)
    is_active: Mapped[bool] = mapped_column(default=False)
    approved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    user_profile: Mapped["UserProfileORM"] = relationship(back_populates="graph_versions")
    nodes: Mapped[list["DecisionNodeORM"]] = relationship(
        back_populates="graph_version", cascade="all, delete-orphan"
    )
    edges: Mapped[list["DecisionEdgeORM"]] = relationship(
        back_populates="graph_version", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_graph_versions_user_status", "user_profile_id", "status"),)
