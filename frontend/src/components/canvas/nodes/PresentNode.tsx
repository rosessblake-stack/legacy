import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PresentBlockProperties } from "@/lib/types";
import type { OntoNodeData } from "./ProfileNode";

export function PresentNode({ data, selected }: NodeProps & { data: OntoNodeData }) {
  const { decisionNode } = data;
  const props = decisionNode.properties as PresentBlockProperties;

  return (
    <div
      className={`w-72 rounded-xl border-2 bg-gradient-to-br from-violet-950/80 to-neutral-900/90 p-4 shadow-lg backdrop-blur ${
        selected ? "border-present shadow-present/40" : "border-violet-700/50"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-present" />
      <Handle type="source" position={Position.Right} className="!bg-present" />
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-present/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
          Presente
        </span>
        {props.has_active_contradiction && (
          <span className="rounded-full bg-contradiction/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
            Contradicción
          </span>
        )}
      </div>
      <p className="mb-2 line-clamp-2 text-sm font-medium text-violet-100">{decisionNode.label}</p>
      <ul className="space-y-1">
        {props.blockers.map((blocker, index) => (
          <li key={index} className="line-clamp-2 text-xs text-violet-200/70">
            · {blocker}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-violet-300/60">
        Sombra dominante: {props.dominant_sin}
      </p>
    </div>
  );
}
