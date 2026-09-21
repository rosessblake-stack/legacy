"use client";

import { useGraphStore } from "@/store/graphStore";
import type {
  DecisionNode,
  FuturePathProperties,
  PastEntryProperties,
  PresentBlockProperties,
  ProfileCardProperties,
} from "@/lib/types";
import { AXIS_LABELS } from "@/lib/types";

function renderProperties(node: DecisionNode) {
  switch (node.node_type) {
    case "PROFILE_CARD": {
      const props = node.properties as ProfileCardProperties;
      return (
        <div className="space-y-3">
          <p className="text-sm text-neutral-300">{props.key_revelation}</p>
          <div className="space-y-2">
            {Object.entries(props.axis_summary).map(([axis, summary]) => (
              <div key={axis}>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  {AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}
                </p>
                <p className="text-sm text-neutral-300">{summary}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "PAST_ENTRY": {
      const props = node.properties as PastEntryProperties;
      return (
        <div className="space-y-2">
          <p className="text-sm text-neutral-300">{props.raw_summary}</p>
          <p className="text-xs text-neutral-500">
            {new Date(props.entry_date).toLocaleString("es-ES")} · {AXIS_LABELS[props.dominant_axis]}
          </p>
        </div>
      );
    }
    case "PRESENT_BLOCK": {
      const props = node.properties as PresentBlockProperties;
      return (
        <div className="space-y-2">
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
            {props.blockers.map((blocker, index) => (
              <li key={index}>{blocker}</li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">Sombra dominante: {props.dominant_sin}</p>
        </div>
      );
    }
    case "FUTURE_PATH": {
      const props = node.properties as FuturePathProperties;
      return (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {props.path_type === "recommended" ? "Camino recomendado" : "Puerta alternativa"} · basado en{" "}
            {props.based_on_axis.map((axis) => AXIS_LABELS[axis]).join(", ")}
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
            {props.supporting_evidence.map((evidence, index) => (
              <li key={index}>{evidence}</li>
            ))}
          </ul>
        </div>
      );
    }
    default:
      return null;
  }
}

export function NodeDetailModal() {
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const selectNode = useGraphStore((state) => state.selectNode);

  if (!selectedNode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => selectNode(null)}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {selectedNode.node_type.replace("_", " ")}
            </span>
            <h2 className="text-lg font-semibold text-neutral-100">{selectedNode.label}</h2>
          </div>
          <button
            onClick={() => selectNode(null)}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {renderProperties(selectedNode)}

        {selectedNode.socratic_recommendation && (
          <div className="mt-4 rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Reflexión socrática
            </p>
            <p className="text-sm italic text-emerald-100">“{selectedNode.socratic_recommendation}”</p>
          </div>
        )}

        {selectedNode.emotional_impact && (
          <p className="mt-3 text-xs text-neutral-500">Impacto emocional: {selectedNode.emotional_impact}</p>
        )}
      </div>
    </div>
  );
}
