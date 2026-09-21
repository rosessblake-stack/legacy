import type {
  AnalyzeResponse,
  DraftDetail,
  DraftListItem,
  GraphResponse,
  UserProfile,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function adminHeaders(extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${ADMIN_API_KEY}`,
    ...extra,
  };
}

export async function createUserProfile(displayName: string, email: string): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName, email }),
  });
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return request<UserProfile>(`/api/v1/users/${userId}`);
}

export async function fetchActiveGraph(userId: string): Promise<GraphResponse> {
  return request<GraphResponse>(`/api/v1/graph/${userId}`);
}

export async function analyzeText(userId: string, text: string): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("user_id", userId);
  form.append("text", text);
  return request<AnalyzeResponse>("/api/v1/analyze", { method: "POST", body: form });
}

export async function analyzeAudio(userId: string, audioBlob: Blob, filename: string): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("user_id", userId);
  form.append("audio", audioBlob, filename);
  return request<AnalyzeResponse>("/api/v1/analyze", { method: "POST", body: form });
}

export async function listDrafts(): Promise<DraftListItem[]> {
  return request<DraftListItem[]>("/api/v1/admin/drafts", { headers: adminHeaders() });
}

export async function getDraftDetail(entryId: string): Promise<DraftDetail> {
  return request<DraftDetail>(`/api/v1/admin/drafts/${entryId}`, { headers: adminHeaders() });
}

export interface NodeEditPayload {
  node_id: string;
  update: {
    label?: string;
    position_x?: number;
    position_y?: number;
    properties?: Record<string, unknown>;
    socratic_recommendation?: string;
    risk_level?: string;
    emotional_impact?: string;
  };
}

export async function approveDraft(
  entryId: string,
  reviewer: string,
  adminNotes: string | null,
  nodeEdits: NodeEditPayload[] = [],
): Promise<DraftDetail> {
  return request<DraftDetail>(`/api/v1/admin/drafts/${entryId}/approve`, {
    method: "PUT",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ reviewer, admin_notes: adminNotes, node_edits: nodeEdits }),
  });
}
