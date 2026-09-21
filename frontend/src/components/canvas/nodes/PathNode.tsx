import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FuturePathProperties } from "@/lib/types";
import type { OntoNodeData } from "./ProfileNode";

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-300",
  medium: "bg-amber-500/20 text-amber-300",
  high: "bg-red-500/20 text-red-300",
};

export function PathNode({ data, selected }: NodeProps & { data: OntoNodeData }) {
  const { decisionNode } = data;
  const props = decisionNode.properties as FuturePathProperties;
  const isRecommended = props.path_type === "recommended";

  return (
    <div
      className={`w-72 rounded-xl border-2 p-4 shadow-lg backdrop-blur ${
        isRecommended
          ? "bg-gradient-to-br from-emerald-950/80 to-neutral-900/90 border-future/60"
          : "bg-gradient-to-br from-neutral-800/70 to-neutral-900/90 border-dashed border-neutral-600/60"
      } ${selected ? "ring-2 ring-future" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-future" />
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isRecommended ? "bg-future/20 text-emerald-300" : "bg-neutral-600/30 text-neutral-300"
          }`}
        >
          {isRecommended ? "Camino recomendado" : "Puerta alternativa"}
        </span>
        {decisionNode.risk_level && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISK_COLORS[decisionNode.risk_level]}`}>
            riesgo {decisionNode.risk_level}
          </span>
        )}
      </div>
      <p className="mb-2 line-clamp-2 text-sm font-medium text-emerald-50">{decisionNode.label}</p>
      {decisionNode.socratic_recommendation && (
        <p className="line-clamp-3 text-xs italic text-emerald-200/70">
          “{decisionNode.socratic_recommendation}”
        </p>
      )}
      {decisionNode.emotional_impact && (
        <p className="mt-2 text-[10px] text-neutral-400">{decisionNode.emotional_impact}</p>
      )}
    </div>
  );
}
