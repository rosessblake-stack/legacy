import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AXIS_LABELS, type DecisionNode, type ProfileCardProperties } from "@/lib/types";

export interface OntoNodeData extends Record<string, unknown> {
  decisionNode: DecisionNode;
}

export function ProfileNode({ data, selected }: NodeProps & { data: OntoNodeData }) {
  const { decisionNode } = data;
  const props = decisionNode.properties as ProfileCardProperties;

  return (
    <div
      className={`w-72 rounded-2xl border-2 bg-gradient-to-br from-amber-950/80 to-neutral-900/90 p-4 shadow-lg backdrop-blur ${
        selected ? "border-profile shadow-profile/40" : "border-amber-700/50"
      }`}
    >
      <Handle type="source" position={Position.Right} className="!bg-profile" />
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-profile/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          Perfil ontológico
        </span>
      </div>
      <h3 className="mb-1 text-base font-semibold text-amber-100">{props.headline}</h3>
      <p className="mb-3 line-clamp-3 text-xs text-amber-200/70">{props.key_revelation}</p>
      <div className="space-y-1">
        {Object.entries(props.axis_intensity).map(([axis, intensity]) => (
          <div key={axis} className="flex items-center gap-2">
            <span className="w-28 truncate text-[10px] text-amber-200/60">
              {AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-900/40">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.round(intensity * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
