"""Initial OntoNav schema: user profiles, analysis entries, graph versions,
decision nodes and edges.

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-21

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from app.core.config import get_settings

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("current_state_summary", sa.Text(), nullable=True),
        sa.Column("dominant_axis", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_user_profiles_email", "user_profiles", ["email"])

    embedding_dimensions = get_settings().embedding_dimensions

    op.create_table(
        "analysis_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_type", sa.String(16), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("audio_asset_url", sa.String(1024), nullable=True),
        sa.Column("axis_1_blockers", sa.JSON(), nullable=False),
        sa.Column("axis_2_shadows", sa.JSON(), nullable=False),
        sa.Column("axis_3_environment", sa.JSON(), nullable=False),
        sa.Column("axis_4_alignment", sa.JSON(), nullable=False),
        sa.Column("axis_5_patterns", sa.JSON(), nullable=False),
        sa.Column("contradictions", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("socratic_reflections", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("embedding", Vector(embedding_dimensions), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("reviewed_by", sa.String(200), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_analysis_entries_user_profile_id", "analysis_entries", ["user_profile_id"])
    op.create_index("ix_analysis_entries_created_at", "analysis_entries", ["created_at"])
    op.create_index(
        "ix_analysis_entries_user_status", "analysis_entries", ["user_profile_id", "status"]
    )

    op.create_table(
        "graph_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "triggered_by_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analysis_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("approved_by", sa.String(200), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_graph_versions_user_profile_id", "graph_versions", ["user_profile_id"])
    op.create_index("ix_graph_versions_created_at", "graph_versions", ["created_at"])
    op.create_index("ix_graph_versions_user_status", "graph_versions", ["user_profile_id", "status"])

    op.create_table(
        "decision_nodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "graph_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("graph_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_analysis_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analysis_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("node_type", sa.String(32), nullable=False),
        sa.Column("label", sa.String(300), nullable=False),
        sa.Column("time_horizon", sa.String(16), nullable=False),
        sa.Column("position_x", sa.Float(), nullable=False, server_default="0"),
        sa.Column("position_y", sa.Float(), nullable=False, server_default="0"),
        sa.Column("properties", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("socratic_recommendation", sa.Text(), nullable=True),
        sa.Column("risk_level", sa.String(16), nullable=True),
        sa.Column("emotional_impact", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_decision_nodes_user_profile_id", "decision_nodes", ["user_profile_id"])
    op.create_index("ix_decision_nodes_graph_version_id", "decision_nodes", ["graph_version_id"])

    op.create_table(
        "decision_edges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "graph_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("graph_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_node_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("decision_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_node_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("decision_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("relation_type", sa.String(32), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1"),
    )
    op.create_index("ix_decision_edges_graph_version_id", "decision_edges", ["graph_version_id"])


def downgrade() -> None:
    op.drop_table("decision_edges")
    op.drop_table("decision_nodes")
    op.drop_table("graph_versions")
    op.drop_table("analysis_entries")
    op.drop_table("user_profiles")
