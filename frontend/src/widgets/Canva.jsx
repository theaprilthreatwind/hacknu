import {
  ReactFlow,
  Background,
  Controls,
  Position,
  Handle,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import { useCallback, useRef } from "react";
import "@xyflow/react/dist/style.css";
import { HiggsfieldVideoNode } from "./brainstorm-board/HiggsfieldVideoNode";
import { HiggsfieldImageUploadNode } from "./nodes/HiggsfieldImageUploadNode";
import { HiggsfieldImageGenerateNode } from "./nodes/HiggsfieldImageGenerateNode";

// ─────────────────────────────────────────────────────────────────
// CursorOverlay — isolated so viewport updates don't re-render graph
// ─────────────────────────────────────────────────────────────────
const CursorOverlay = ({ remoteCursors }) => {
  const { x, y, zoom } = useViewport();

  return (
    <>
      {Object.values(remoteCursors || {}).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute top-0 left-0 pointer-events-none z-50 transition-transform duration-75 ease-linear flex flex-col items-center"
          style={{
            transform: `translate(${cursor.x * zoom + x}px, ${cursor.y * zoom + y}px)`,
            transformOrigin: "top left",
          }}
        >
          {/* Cursor SVG — accent color #d1fe17 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md text-h_accent"
          >
            <path
              d="M5.65376 21.2087C5.46747 21.637 4.82137 21.5458 4.75704 21.082L2.09139 1.88451C2.02983 1.44123 2.50856 1.10906 2.9158 1.31174L21.7371 10.6781C22.1523 10.8847 22.1287 11.4883 21.6967 11.6644L13.6896 14.9288C13.5186 14.9985 13.3855 15.1316 13.3158 15.3026L10.0514 23.3097C9.87532 23.7417 9.27173 23.7653 9.06512 23.3501L5.65376 21.2087Z"
              fill="currentColor"
            />
          </svg>
          {/* Name badge — dark text on accent for contrast */}
          <div className="bg-h_accent text-h_bg_main text-xs px-2 py-0.5 rounded-full mt-1 font-bold whitespace-nowrap shadow-sm scale-75 origin-top">
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────
// FlowWrapper — pointer tracking + pane-click node creation
// Must live inside ReactFlowProvider to access useReactFlow
// ─────────────────────────────────────────────────────────────────
const FlowWrapper = ({
  children,
  onCursorMove,
  guestId,
  user,
  activeTool,
  setActiveTool,
  setNodes,
  roomId,
  token,
  apiBaseUrl,
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const lastUpdateRef = useRef(0);

  const handlePointerMove = (e) => {
    if (!onCursorMove) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < 50) return;
    lastUpdateRef.current = now;

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onCursorMove({
      userId: user?.id || guestId,
      name: user?.name || "Teammate",
      x: flowPos.x,
      y: flowPos.y,
    });
  };

  const handlePaneClick = useCallback(
    (event) => {
      if (!activeTool || activeTool === "select") return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `node-${Date.now()}`;
      let newNode = null;

      if (activeTool === "rect") {
        newNode = {
          id: newNodeId,
          type: "higgsfield",
          position,
          data: {
            label: "New card",
            content: "Click to edit…",
            active: false,
          },
        };
      } else if (activeTool === "circle") {
        newNode = {
          id: newNodeId,
          type: "default",
          position,
          data: { label: "Circle node" },
          style: {
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "#1a1a1a",
            color: "#fefefe",
            border: "2px solid #d1fe17",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
          },
        };
      } else if (activeTool === 'text') {
        newNode = {
          id: newNodeId,
          type: 'imageGenerate',
          position,
          data: { status: 'idle', prompt: '', url: null, roomId, token, apiBaseUrl },
        };
      } else if (activeTool === 'image') {
        newNode = {
          id: newNodeId,
          type: 'imageUpload',
          position,
          data: { url: null, fileName: null, prompt: '' },
        };
      } else if (activeTool === 'generate') {
        newNode = {
          id: newNodeId,
          type: 'higgsfieldVideo',
          position,
          data: { status: 'waiting', prompt: '', roomId, token, apiBaseUrl },
        };
      }

      if (newNode) {
        setNodes((nds) => nds.concat(newNode));
      }

      // Return to select after placing
      if (setActiveTool) setActiveTool("select");
    },
    [activeTool, setActiveTool, setNodes, screenToFlowPosition, roomId, token, apiBaseUrl]
  );

  const handleWrapperClickCapture = useCallback(
    (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (!target.closest(".react-flow__pane")) {
        return;
      }

      handlePaneClick(event);
    },
    [handlePaneClick],
  );

  return (
    <div
      className={`w-full h-full ${activeTool && activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
      onPointerMove={handlePointerMove}
      onClickCapture={handleWrapperClickCapture}
    >
      {children(handlePaneClick)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Default Higgsfield card node
// ─────────────────────────────────────────────────────────────────
function HiggsfieldNode({ data }) {
  return (
    <div className="min-w-[180px] p-4 rounded-xl bg-h_bg_card border border-[#2a2a2a] shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-h_accent/60 hover:shadow-[0_0_25px_rgba(209,254,23,0.15)] transition-all duration-300 group">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full ${
            data.active
              ? "bg-h_accent shadow-[0_0_8px_rgba(209,254,23,0.8)]"
              : "bg-[#2a2a2a]"
          }`}
        />
        <div className="font-mono text-xs text-h_text_secondary uppercase tracking-wider">
          {data.label}
        </div>
      </div>
      <div className="text-sm text-h_text_primary font-medium leading-relaxed">
        {data.content}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-h_bg_main !border-2 !border-h_accent opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-h_bg_main !border-2 !border-h_accent opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}

const nodeTypes = {
  higgsfield: HiggsfieldNode,
  higgsfieldVideo: HiggsfieldVideoNode,
  imageUpload: HiggsfieldImageUploadNode,
  imageGenerate: HiggsfieldImageGenerateNode,
};

// ─────────────────────────────────────────────────────────────────
// Main Canva export
// ─────────────────────────────────────────────────────────────────
export function Canva({
  nodes,
  setNodes,
  onNodesChange,
  edges,
  onEdgesChange,
  onConnect,
  remoteCursors,
  onCursorMove,
  guestId,
  user,
  activeTool,
  setActiveTool,
  roomId,
  token,
  apiBaseUrl,
}) {
  // onNodesChange / onEdgesChange / onConnect come from WorkspacePage
  // so that connection logic (Image-to-Video trigger) lives there.

  return (
    <ReactFlowProvider>
      <FlowWrapper
        onCursorMove={onCursorMove}
        guestId={guestId}
        user={user}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        setNodes={setNodes}
        roomId={roomId}
        token={token}
        apiBaseUrl={apiBaseUrl}
      >
        {(handlePaneClick) => (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={handlePaneClick}
            deleteKeyCode={['Backspace', 'Delete']}
            colorMode="dark"
            style={{ background: "#131313" }}
            fitView
          >
            <CursorOverlay remoteCursors={remoteCursors} />
            <Controls className="!bg-h_bg_card !border-[#2a2a2a] [&_button]:!fill-h_text_secondary [&_button:hover]:!fill-h_text_primary" />
            <Background color="#222222" gap={24} size={1} />
          </ReactFlow>
        )}
      </FlowWrapper>
    </ReactFlowProvider>
  );
}
