import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AXIS_LABELS, type PastEntryProperties } from "@/lib/types";
import type { OntoNodeData } from "./ProfileNode";

export function PastNode({ data, selected }: NodeProps & { data: OntoNodeData }) {
  const { decisionNode } = data;
  const props = decisionNode.properties as PastEntryProperties;

  return (
    <div
      className={`w-60 rounded-xl border bg-neutral-900/80 p-3 shadow backdrop-blur ${
        selected ? "border-past shadow-past/40" : "border-neutral-700/60"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-past" />
      <Handle type="source" position={Position.Right} className="!bg-past" />
      <div className="mb-1 flex items-center justify-between">
        <span className="rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          Pasado
        </span>
        <span className="text-[10px] text-slate-400">
          {new Date(props.entry_date).toLocaleDateString("es-ES")}
        </span>
      </div>
      <p className="line-clamp-3 text-xs text-slate-200">{props.raw_summary}</p>
      <p className="mt-2 text-[10px] text-slate-400">{AXIS_LABELS[props.dominant_axis]}</p>
    </div>
  );
}
