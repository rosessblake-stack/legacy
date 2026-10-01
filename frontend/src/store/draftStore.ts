import { create } from "zustand";
import {
  ApiError,
  approveDraft as approveDraftRequest,
  getDraftDetail,
  listDrafts,
  type NodeEditPayload,
} from "@/lib/api";
import type { DraftDetail, DraftListItem } from "@/lib/types";

interface DraftState {
  drafts: DraftListItem[];
  activeDraft: DraftDetail | null;
  pendingNodeEdits: Record<string, NodeEditPayload["update"]>;
  isLoading: boolean;
  error: string | null;
  loadDrafts: () => Promise<void>;
  loadDraftDetail: (entryId: string) => Promise<void>;
  stageNodeEdit: (nodeId: string, update: NodeEditPayload["update"]) => void;
  approve: (entryId: string, reviewer: string, adminNotes: string | null) => Promise<void>;
  clearActiveDraft: () => void;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: [],
  activeDraft: null,
  pendingNodeEdits: {},
  isLoading: false,
  error: null,

  loadDrafts: async () => {
    set({ isLoading: true, error: null });
    try {
      const drafts = await listDrafts();
      set({ drafts, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudieron cargar los borradores.";
      set({ error: message, isLoading: false });
    }
  },

  loadDraftDetail: async (entryId: string) => {
    set({ isLoading: true, error: null, pendingNodeEdits: {} });
    try {
      const activeDraft = await getDraftDetail(entryId);
      set({ activeDraft, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo cargar el borrador.";
      set({ error: message, isLoading: false });
    }
  },

  stageNodeEdit: (nodeId: string, update: NodeEditPayload["update"]) => {
    set((state) => ({
      pendingNodeEdits: {
        ...state.pendingNodeEdits,
        [nodeId]: { ...state.pendingNodeEdits[nodeId], ...update },
      },
    }));
  },

  approve: async (entryId: string, reviewer: string, adminNotes: string | null) => {
    const edits: NodeEditPayload[] = Object.entries(get().pendingNodeEdits).map(([nodeId, update]) => ({
      node_id: nodeId,
      update,
    }));
    set({ isLoading: true, error: null });
    try {
      const activeDraft = await approveDraftRequest(entryId, reviewer, adminNotes, edits);
      set((state) => ({
        activeDraft,
        pendingNodeEdits: {},
        isLoading: false,
        drafts: state.drafts.filter((d) => d.analysis_entry_id !== entryId),
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo aprobar el borrador.";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearActiveDraft: () => set({ activeDraft: null, pendingNodeEdits: {} }),
}));
