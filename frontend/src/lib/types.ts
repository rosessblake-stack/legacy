export type OntologicalAxis =
  | "axis_1_blockers"
  | "axis_2_shadows"
  | "axis_3_environment"
  | "axis_4_alignment"
  | "axis_5_patterns";

export const AXIS_LABELS: Record<OntologicalAxis, string> = {
  axis_1_blockers: "Eje 1 · Bloqueos reales",
  axis_2_shadows: "Eje 2 · Sombras y pecados",
  axis_3_environment: "Eje 3 · Dinámica del entorno",
  axis_4_alignment: "Eje 4 · Alineación de identidad",
  axis_5_patterns: "Eje 5 · Patrones e inercia",
};

export type CapitalSin =
  | "soberbia"
  | "envidia"
  | "ira"
  | "pereza"
  | "avaricia"
  | "gula"
  | "lujuria";

export type PainOrigin = "financiero" | "proceso" | "producto_servicio" | "soporte";
export type InertiaType = "accion" | "exito";
export type EntrySourceType = "text" | "audio";
export type AnalysisStatus = "draft" | "approved";
export type NodeType = "PROFILE_CARD" | "PAST_ENTRY" | "PRESENT_BLOCK" | "FUTURE_PATH";
export type PathType = "recommended" | "alternative_gate";
export type EdgeRelation = "leads_to" | "reveals" | "contradicts" | "opens_gate";
export type TimeHorizon = "past" | "present" | "future";
export type RiskLevel = "low" | "medium" | "high";

export interface Axis1Blockers {
  summary: string;
  intensity: number;
  pain_functional: string;
  pain_emotional: string;
  pain_social: string;
  pain_origin: PainOrigin;
  anchored_moment: string;
  evidence_quotes: string[];
}

export interface Axis2Shadows {
  summary: string;
  intensity: number;
  dominant_sin: CapitalSin;
  sin_intensity_map: Record<CapitalSin, number>;
  opposing_virtue_practice: string;
  impostor_signal: boolean;
  champagne_moment: string | null;
  evidence_quotes: string[];
}

export interface Axis3Environment {
  summary: string;
  intensity: number;
  cialdini_principles_present: string[];
  stepps_factors_present: string[];
  reaction_pattern: string;
  controversy_signal: boolean;
  external_constraints: string[];
  evidence_quotes: string[];
}

export interface Axis4Alignment {
  summary: string;
  intensity: number;
  hoped_self: string;
  feared_self: string;
  expected_self: string;
  declared_goal: string;
  real_desire_inferred: string;
  contradiction_detected: boolean;
  contradiction_description: string | null;
  aspirational_group: string | null;
  evidence_quotes: string[];
}

export interface Axis5Patterns {
  summary: string;
  intensity: number;
  behavioral_loop: string;
  determinators: string[];
  inertia_type: InertiaType;
  similar_past_case_hint: string | null;
  evidence_quotes: string[];
}

export interface ContradictionFinding {
  axes_involved: OntologicalAxis[];
  description: string;
  socratic_reflection: string;
}

export interface AnalysisEntry {
  id: string;
  user_profile_id: string;
  source_type: EntrySourceType;
  raw_text: string;
  audio_asset_url: string | null;
  axis_1_blockers: Axis1Blockers;
  axis_2_shadows: Axis2Shadows;
  axis_3_environment: Axis3Environment;
  axis_4_alignment: Axis4Alignment;
  axis_5_patterns: Axis5Patterns;
  contradictions: ContradictionFinding[];
  socratic_reflections: string[];
  status: AnalysisStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface ProfileCardProperties {
  headline: string;
  key_revelation: string;
  axis_summary: Record<OntologicalAxis, string>;
  axis_intensity: Record<OntologicalAxis, number>;
}

export interface PastEntryProperties {
  entry_date: string;
  source_type: EntrySourceType;
  raw_summary: string;
  dominant_axis: OntologicalAxis;
}

export interface PresentBlockProperties {
  blockers: string[];
  dominant_sin: CapitalSin;
  has_active_contradiction: boolean;
  raw_summary?: string;
}

export interface FuturePathProperties {
  path_type: PathType;
  based_on_axis: OntologicalAxis[];
  supporting_evidence: string[];
}

export type DecisionNodeProperties =
  | ProfileCardProperties
  | PastEntryProperties
  | PresentBlockProperties
  | FuturePathProperties;

export interface DecisionNode {
  id: string;
  graph_version_id: string;
  node_type: NodeType;
  label: string;
  time_horizon: TimeHorizon;
  position_x: number;
  position_y: number;
  properties: DecisionNodeProperties;
  socratic_recommendation: string | null;
  risk_level: RiskLevel | null;
  emotional_impact: string | null;
  created_at: string;
}

export interface DecisionEdge {
  id: string;
  graph_version_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: EdgeRelation;
  weight: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  current_state_summary: string | null;
  dominant_axis: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraphResponse {
  user_profile: UserProfile;
  active_graph_version_id: string | null;
  nodes: DecisionNode[];
  edges: DecisionEdge[];
  version_history: string[];
}

export interface DraftListItem {
  analysis_entry_id: string;
  graph_version_id: string;
  user_profile_id: string;
  user_display_name: string;
  created_at: string;
  dominant_axis: OntologicalAxis;
  has_contradictions: boolean;
}

export interface DraftDetail {
  analysis_entry: AnalysisEntry;
  graph_version_id: string;
  nodes: DecisionNode[];
  edges: DecisionEdge[];
}

export interface AnalyzeResponse {
  analysis_entry_id: string;
  graph_version_id: string;
  status: AnalysisStatus;
}
