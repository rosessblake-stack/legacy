import { create } from "zustand";
import { ApiError, fetchActiveGraph } from "@/lib/api";
import type { DecisionEdge, DecisionNode, GraphResponse } from "@/lib/types";

interface GraphState {
  userId: string | null;
  graph: GraphResponse | null;
  selectedNode: DecisionNode | null;
  isLoading: boolean;
  error: string | null;
  loadGraph: (userId: string) => Promise<void>;
  selectNode: (node: DecisionNode | null) => void;
  nodeById: (nodeId: string) => DecisionNode | undefined;
  edgesForNode: (nodeId: string) => DecisionEdge[];
}

export const useGraphStore = create<GraphState>((set, get) => ({
  userId: null,
  graph: null,
  selectedNode: null,
  isLoading: false,
  error: null,

  loadGraph: async (userId: string) => {
    set({ isLoading: true, error: null, userId });
    try {
      const graph = await fetchActiveGraph(userId);
      set({ graph, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo cargar el mapa.";
      set({ error: message, isLoading: false });
    }
  },

  selectNode: (node: DecisionNode | null) => set({ selectedNode: node }),

  nodeById: (nodeId: string) => get().graph?.nodes.find((n) => n.id === nodeId),

  edgesForNode: (nodeId: string) =>
    get().graph?.edges.filter((e) => e.source_node_id === nodeId || e.target_node_id === nodeId) ?? [],
}));
