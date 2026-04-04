import {
  ReactFlow,
  Background,
  Controls,
  Position,
  Handle,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import { useState, useCallback } from "react";
import "@xyflow/react/dist/style.css";

// Кастомная нода в стиле Higgsfield
function HiggsfieldNode({ data }) {
  return (
    <div className="min-w-[180px] p-4 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-800 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)] transition-all duration-300 group">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${data.active ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-neutral-600'}`}></div>
        <div className="font-mono text-xs text-neutral-400 uppercase tracking-wider">{data.label}</div>
      </div>
      <div className="text-sm text-neutral-200 font-medium">{data.content}</div>

      {/* Кастомные коннекторы (точки соединения) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-neutral-900 border-2 border-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-neutral-900 border-2 border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}

const nodeTypes = {
  higgsfield: HiggsfieldNode,
};

const initialNodes = [
  {
    id: "prompt-1",
    position: { x: 100, y: 100 },
    type: "higgsfield",
    data: { label: "PROMPT", content: "Киберпанк город, 4k", active: true },
  },
  {
    id: "media-1",
    position: { x: 100, y: 300 },
    type: "higgsfield",
    data: { label: "GENERATION", content: "Ожидание видео...", active: false },
  },
];

const initialEdges = [
  { id: "e1-2", source: "prompt-1", target: "media-1", animated: true, style: { stroke: '#22d3ee', strokeWidth: 2 } },
];

export function Canva() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="h-full w-full bg-neutral-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode="dark"
        fitView
      >
        <Controls className="bg-neutral-900 border-neutral-800 fill-neutral-300" />
        <Background color="#262626" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}