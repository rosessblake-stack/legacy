"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlow, Background, Controls, MarkerType, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useDraftStore } from "@/store/draftStore";
import { AXIS_LABELS } from "@/lib/types";
import type { OntoNodeData } from "@/components/canvas/nodes/ProfileNode";
import { ProfileNode } from "@/components/canvas/nodes/ProfileNode";
import { PastNode } from "@/components/canvas/nodes/PastNode";
import { PresentNode } from "@/components/canvas/nodes/PresentNode";
import { PathNode } from "@/components/canvas/nodes/PathNode";

const nodeTypes = {
  PROFILE_CARD: ProfileNode,
  PAST_ENTRY: PastNode,
  PRESENT_BLOCK: PresentNode,
  FUTURE_PATH: PathNode,
};

export default function AdminDraftDetailPage({ params }: { params: { entryId: string } }) {
  const { entryId } = params;
  const router = useRouter();
  const activeDraft = useDraftStore((state) => state.activeDraft);
  const isLoading = useDraftStore((state) => state.isLoading);
  const error = useDraftStore((state) => state.error);
  const loadDraftDetail = useDraftStore((state) => state.loadDraftDetail);
  const approve = useDraftStore((state) => state.approve);
  const clearActiveDraft = useDraftStore((state) => state.clearActiveDraft);

  const [reviewer, setReviewer] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    void loadDraftDetail(entryId);
    return () => clearActiveDraft();
  }, [entryId, loadDraftDetail, clearActiveDraft]);

  const flowNodes: Node<OntoNodeData>[] = useMemo(
    () =>
      activeDraft?.nodes.map((node) => ({
        id: node.id,
        type: node.node_type,
        position: { x: node.position_x, y: node.position_y },
        data: { decisionNode: node },
      })) ?? [],
    [activeDraft],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      activeDraft?.edges.map((edge) => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        label: edge.relation_type.replace("_", " "),
        markerEnd: { type: MarkerType.ArrowClosed },
      })) ?? [],
    [activeDraft],
  );

  const handleApprove = async () => {
    if (!reviewer.trim()) return;
    setIsApproving(true);
    try {
      await approve(entryId, reviewer.trim(), adminNotes.trim() || null);
      router.push("/admin");
    } catch {
      // error already captured in store
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading && !activeDraft) {
    return <main className="p-10 text-sm text-neutral-400">Cargando borrador…</main>;
  }
  if (error) {
    return <main className="p-10 text-sm text-red-400">{error}</main>;
  }
  if (!activeDraft) return null;

  const entry = activeDraft.analysis_entry;
  const axes = [
    { key: "axis_1_blockers", label: AXIS_LABELS.axis_1_blockers, data: entry.axis_1_blockers },
    { key: "axis_2_shadows", label: AXIS_LABELS.axis_2_shadows, data: entry.axis_2_shadows },
    { key: "axis_3_environment", label: AXIS_LABELS.axis_3_environment, data: entry.axis_3_environment },
    { key: "axis_4_alignment", label: AXIS_LABELS.axis_4_alignment, data: entry.axis_4_alignment },
    { key: "axis_5_patterns", label: AXIS_LABELS.axis_5_patterns, data: entry.axis_5_patterns },
  ];

  return (
    <main className="grid min-h-screen grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_420px]">
      <div className="h-[70vh] overflow-hidden rounded-2xl border border-neutral-800 lg:h-full">
        <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
          <Background color="#27272a" gap={24} />
          <Controls className="!bg-neutral-900 !text-neutral-200" />
        </ReactFlow>
      </div>

      <div className="space-y-5 overflow-y-auto">
        <div>
          <h1 className="text-lg font-semibold text-neutral-50">Revisión del borrador</h1>
          <p className="text-xs text-neutral-500">Texto original</p>
          <p className="mt-1 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm text-neutral-300">
            {entry.raw_text}
          </p>
        </div>

        {axes.map(({ key, label, data }) => (
          <div key={key} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">{label}</p>
            <p className="text-sm text-neutral-300">{data.summary}</p>
            <p className="mt-1 text-[10px] text-neutral-500">Intensidad: {Math.round(data.intensity * 100)}%</p>
          </div>
        ))}

        {entry.contradictions.length > 0 && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">Contradicciones detectadas</p>
            {entry.contradictions.map((c, index) => (
              <div key={index} className="mb-2 last:mb-0">
                <p className="text-sm text-red-100">{c.description}</p>
                <p className="text-xs italic text-red-300/80">“{c.socratic_reflection}”</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Reflexiones socráticas generadas
          </p>
          <ul className="space-y-1">
            {entry.socratic_reflections.map((reflection, index) => (
              <li key={index} className="text-sm italic text-neutral-300">
                “{reflection}”
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-profile/40 bg-amber-950/10 p-3">
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Tu nombre (administrador)"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-profile"
          />
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Notas internas (opcional)"
            rows={2}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-profile"
          />
          <button
            onClick={handleApprove}
            disabled={isApproving || !reviewer.trim()}
            className="w-full rounded-lg bg-profile px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {isApproving ? "Aprobando…" : "Aprobar y liberar"}
          </button>
        </div>
      </div>
    </main>
  );
}
