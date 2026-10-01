"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useGraphStore } from "@/store/graphStore";
import type { DecisionEdge, DecisionNode, EdgeRelation } from "@/lib/types";
import type { OntoNodeData } from "./nodes/ProfileNode";
import { ProfileNode } from "./nodes/ProfileNode";
import { PastNode } from "./nodes/PastNode";
import { PresentNode } from "./nodes/PresentNode";
import { PathNode } from "./nodes/PathNode";
import { NodeDetailModal } from "./NodeDetailModal";

const nodeTypes = {
  PROFILE_CARD: ProfileNode,
  PAST_ENTRY: PastNode,
  PRESENT_BLOCK: PresentNode,
  FUTURE_PATH: PathNode,
};

const EDGE_STYLES: Record<EdgeRelation, { stroke: string; dashed: boolean; animated: boolean }> = {
  leads_to: { stroke: "#94a3b8", dashed: false, animated: false },
  reveals: { stroke: "#f59e0b", dashed: false, animated: false },
  contradicts: { stroke: "#ef4444", dashed: true, animated: true },
  opens_gate: { stroke: "#22c55e", dashed: true, animated: false },
};

function toFlowNode(node: DecisionNode): Node<OntoNodeData> {
  return {
    id: node.id,
    type: node.node_type,
    position: { x: node.position_x, y: node.position_y },
    data: { decisionNode: node },
  };
}

function toFlowEdge(edge: DecisionEdge): Edge {
  const style = EDGE_STYLES[edge.relation_type];
  return {
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    label: edge.relation_type.replace("_", " "),
    animated: style.animated,
    style: { stroke: style.stroke, strokeDasharray: style.dashed ? "6 4" : undefined },
    markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
    labelStyle: { fill: "#94a3b8", fontSize: 10 },
  };
}

export function OntologyCanvas({ userId }: { userId: string }) {
  const loadGraph = useGraphStore((state) => state.loadGraph);
  const graph = useGraphStore((state) => state.graph);
  const isLoading = useGraphStore((state) => state.isLoading);
  const error = useGraphStore((state) => state.error);
  const selectNode = useGraphStore((state) => state.selectNode);

  useEffect(() => {
    void loadGraph(userId);
  }, [loadGraph, userId]);

  const initialNodes = useMemo(() => graph?.nodes.map(toFlowNode) ?? [], [graph]);
  const initialEdges = useMemo(() => graph?.edges.map(toFlowEdge) ?? [], [graph]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    const decisionNode = graph?.nodes.find((n) => n.id === node.id);
    if (decisionNode) selectNode(decisionNode);
  };

  if (isLoading && !graph) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        Cargando tu mapa ontológico…
      </div>
    );
  }

  if (error) {
    return <div className="flex h-full w-full items-center justify-center text-red-400">{error}</div>;
  }

  if (graph && graph.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        Todavía no hay un mapa aprobado para este perfil. Envía tu primera entrada para comenzar.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls className="!bg-neutral-900 !text-neutral-200" />
        <MiniMap
          className="!bg-neutral-900"
          nodeColor={(node) => {
            switch (node.type) {
              case "PROFILE_CARD":
                return "#f59e0b";
              case "PAST_ENTRY":
                return "#64748b";
              case "PRESENT_BLOCK":
                return "#8b5cf6";
              case "FUTURE_PATH":
                return "#22c55e";
              default:
                return "#52525b";
            }
          }}
        />
      </ReactFlow>
      <NodeDetailModal />
    </div>
  );
}
