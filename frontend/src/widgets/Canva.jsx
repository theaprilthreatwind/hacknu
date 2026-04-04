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

const nodeTypes = {
  note: NoteNode,
};

export function Canva() {
  const [nodes, setNodes] = useState([
    {
      id: "n1",
      position: {
        x: 0,
        y: 0,
      },
      type: "note",
      data: { title: "123" },
    },
    {
      id: "n2",
      position: { x: 30, y: 100 },
      data: { label: "Node 1" },
    },
  ]);
  const [edges, setEdges] = useState([]);
  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

function NoteNode({ data }) {
  return (
    <div className="w-30 h-30 bg-amber-300">
      <div>{data.title}</div>
      <Handle position={Position.Top} id="top" />
      <Handle position={Position.Right} id="right" />
      <Handle position={Position.Bottom} id="bottom" />
      <Handle position={Position.Left} id="left" />
    </div>
  );
}
