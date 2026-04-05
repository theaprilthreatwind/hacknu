import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { Canva } from "../../../widgets/Canva";
import { FloatingAICommand } from "../../../widgets/floating-ai-command";
import { chatWithRoomAi, fetchRoom } from "../../../shared/api/platform";
import { saveCanvasState as apiSaveCanvasState } from "../../../shared/api/canvas";
import { createRoomConnection } from "../../../shared/api/realtime";

// ─── Tool definitions ─────────────────────────────────────────────
const TOOLS = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3l14 9-7 1-4 7-3-17z"/>
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>
      </svg>
    ),
  },
  {
    id: 'image',
    label: 'Image',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
    ),
  },
  { id: 'divider', label: '', icon: null },
  {
    id: 'generate',
    label: 'Generate',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    accent: true,
  },
];

// ─── Figma-style top toolbar ──────────────────────────────────────
const TopToolbar = ({ activeTool, onToolSelect }) => (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-h_bg_card border border-[#2a2a2a] shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
    {TOOLS.map((tool) => {
      if (tool.id === 'divider') {
        return <div key="divider" className="w-px h-6 bg-[#2a2a2a] mx-1.5" />;
      }
      const isActive = activeTool === tool.id;
      const isAccent = tool.accent;
      return (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onToolSelect(tool.id)}
          className={[
            'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150',
            isActive
              ? 'bg-h_accent/15 text-h_accent shadow-[0_0_12px_rgba(209,254,23,0.2)]'
              : isAccent
              ? 'text-h_accent/70 hover:text-h_accent hover:bg-h_accent/10'
              : 'text-h_text_secondary hover:text-h_text_primary hover:bg-white/5',
          ].join(' ')}
        >
          {tool.icon}
          <span className="text-[9px] font-medium tracking-wide opacity-70 leading-none">
            {tool.label}
          </span>
          {isActive && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-h_accent" />
          )}
        </button>
      );
    })}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────
export const WorkspacePage = ({ sessionConfig }) => {
  const { roomId } = useParams();
  const guestId = useMemo(() => Math.random().toString(36).substring(7), []);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTool, setActiveTool] = useState('select');

  const [remoteCursors, setRemoteCursors] = useState({});
  const connectionRef = useRef(null);

  // ── React Flow interactivity handlers ────────────────────────────
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // onConnect: wires nodes + triggers Image-to-Video pipeline
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: '#d1fe17', strokeWidth: 1.5 } },
          eds
        )
      );

      // Image-to-Video: if source is any image node → target is video node
      setNodes((nds) => {
        const sourceNode = nds.find((n) => n.id === params.source);
        const targetNode = nds.find((n) => n.id === params.target);

        if (
          sourceNode?.type?.startsWith('image') &&
          targetNode?.type === 'higgsfieldVideo' &&
          targetNode.data.status === 'waiting'
        ) {
          const imagePrompt = sourceNode.data.prompt || '';
          const videoStylePrompt = targetNode.data.prompt || '';
          const imageUrl = sourceNode.data.url || null;

          return nds.map((node) =>
            node.id === params.target
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'loading',
                    imageUrl,
                    finalPrompt: imagePrompt && videoStylePrompt
                      ? `${imagePrompt} with ${videoStylePrompt}`
                      : imagePrompt || videoStylePrompt || 'Cinematic B-roll',
                  },
                }
              : node
          );
        }

        // Generic: also flip any video node from waiting → loading
        if (targetNode?.type === 'higgsfieldVideo' && targetNode.data.status === 'waiting') {
          return nds.map((node) =>
            node.id === params.target
              ? { ...node, data: { ...node.data, status: 'loading' } }
              : node
          );
        }

        return nds;
      });
    },
    [setEdges, setNodes]
  );

  // 1. Load room on mount
  useEffect(() => {
    if (!roomId || !sessionConfig?.token) return;

    const loadRoomState = async () => {
      try {
        const response = await fetchRoom({
          apiBaseUrl: sessionConfig.apiBaseUrl,
          token: sessionConfig.token,
          roomId,
        });

        const payload =
          response?.payload?.data ||
          response?.payload ||
          response?.data?.data ||
          response?.data ||
          response;
        console.log('[DEBUG] Room load response:', payload);

        const state =
          typeof payload.canvas_state === 'string'
            ? JSON.parse(payload.canvas_state)
            : payload.canvas_state;

        if (state && Array.isArray(state.nodes)) {
          setNodes(state.nodes);
          setEdges(state.edges || []);
          console.log('[DEBUG] Canvas loaded from DB:', state.nodes);
        } else {
          console.warn('[DEBUG] canvas_state empty or malformed:', state);
        }
      } catch (error) {
        console.error('Room load error:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadRoomState();
  }, [roomId, sessionConfig]);

  // 1.5 WebSockets: realtime collaboration
  useEffect(() => {
    if (!roomId || !isHydrated || !sessionConfig?.token) return;

    const connection = createRoomConnection({
      apiBaseUrl: sessionConfig.apiBaseUrl,
      token: sessionConfig.token,
      roomId,
      onReady: (status) => console.log('[WebSockets]', status.message),
      onPresenceSync: (users) => console.log('In room:', users),
      onCursorMoved: (data) => {
        setRemoteCursors((prev) => ({ ...prev, [data.userId]: data }));
      },
      onCanvasUpdated: (newState) => {
        const parsedState =
          typeof newState === 'string' ? JSON.parse(newState) : newState;
        if (parsedState?.nodes) setNodes(parsedState.nodes);
        if (parsedState?.edges) setEdges(parsedState.edges);
      },
    });

    connectionRef.current = connection;
    return () => connection.disconnect();
  }, [roomId, isHydrated, sessionConfig]);

  const handleSaveCanvas = useCallback(async (currentNodes, currentEdges) => {
    try {
      const result = await apiSaveCanvasState({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
        roomId,
        canvasState: { nodes: currentNodes, edges: currentEdges },
      });
      if (!result?.ok) {
        console.error('[DEBUG] DB save error:', result?.message || result);
      } else {
        console.log('[DEBUG] Saved to DB. Nodes:', currentNodes.length);
      }
    } catch (error) {
      console.error('Failed to save canvas state:', error);
    }
  }, [roomId, sessionConfig?.apiBaseUrl, sessionConfig?.token]);

  // 2. Debounced canvas auto-save
  useEffect(() => {
    if (!isHydrated || !roomId || nodes.length === 0) return;

    const timeoutId = setTimeout(() => {
      handleSaveCanvas(nodes, edges);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, roomId, isHydrated, handleSaveCanvas]);

  // 3. AI submit handler
  const handleAiSubmit = async (prompt) => {
    if (!roomId) return;
    setIsAiGenerating(true);
    try {
      console.log('1. Sending prompt:', prompt);
      const response = await chatWithRoomAi({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
        roomId,
        prompt,
        canvas_state: nodes,
      });
      console.log('2. Raw API response:', response);

      const aiData = response?.payload || response?.data || response;
      console.log('3. AI data extracted:', aiData);

      if (aiData && Array.isArray(aiData.new_nodes) && aiData.new_nodes.length > 0) {
        console.log('4. Adding nodes:', aiData.new_nodes);

        setNodes((prev) => {
          const maxY = prev.reduce((max, node) => Math.max(max, node.position.y), 0);
          const startX = 100;
          const startY = prev.length > 0 ? maxY + 250 : 100;

          const neatlyPlacedNodes = aiData.new_nodes.map((node, index) => ({
            ...node,
            position: { x: startX + index * 350, y: startY },
          }));

          return [...prev, ...neatlyPlacedNodes];
        });
      } else {
        console.warn('Warning: new_nodes empty or not found!', aiData);
      }

      if (aiData && Array.isArray(aiData.new_edges)) {
        setEdges((prev) => [...prev, ...aiData.new_edges]);
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-h_black overflow-hidden font-sans text-h_text_primary">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-60 flex-shrink-0 bg-h_bg_card border-r border-[#2a2a2a] flex flex-col z-10">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-h_accent flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#131313"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-h_text_primary tracking-tight">
              Higgsfield Workspace
            </span>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="text-[10px] font-semibold text-h_text_secondary uppercase tracking-widest px-2 mb-2">
            Boards
          </p>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-h_accent/10 border border-h_accent/20 cursor-pointer transition-all hover:bg-h_accent/15">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-h_accent flex-shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span className="text-sm text-h_accent font-medium truncate">Main board</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#2a2a2a] space-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-h_accent animate-pulse shadow-[0_0_6px_rgba(209,254,23,0.7)]"/>
            <span className="text-xs text-h_text_secondary">
              Live · {Object.keys(remoteCursors).length + 1} online
            </span>
          </div>
          <Link
            to="/hub"
            className="w-full flex items-center justify-center gap-2 bg-h_accent/10 hover:bg-h_accent/20 border border-h_accent/30 text-h_accent py-2 px-4 rounded-xl text-xs font-semibold transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Вернуться в дашборд
          </Link>
          <button className="w-full flex items-center justify-center gap-2 bg-h_accent/10 hover:bg-h_accent/20 border border-h_accent/30 text-h_accent py-2 px-4 rounded-xl text-xs font-semibold transition-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share link
          </button>
        </div>
      </aside>

      {/* ── MAIN CANVAS AREA ── */}
      <main className="flex-1 relative bg-h_bg_main overflow-hidden">

        {/* Figma-style top toolbar */}
        <TopToolbar activeTool={activeTool} onToolSelect={setActiveTool} />

        {/* React Flow canvas */}
        <div className="absolute inset-0">
          <Canva
            nodes={nodes}
            setNodes={setNodes}
            onNodesChange={onNodesChange}
            edges={edges}
            setEdges={setEdges}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            remoteCursors={remoteCursors}
            onCursorMove={(pos) => connectionRef.current?.broadcastCursor(pos)}
            guestId={guestId}
            user={sessionConfig?.user}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            roomId={roomId}
            token={sessionConfig?.token}
            apiBaseUrl={sessionConfig?.apiBaseUrl || 'http://127.0.0.1:8000/api'}
          />
        </div>

        {/* Floating AI prompt bar */}
        <FloatingAICommand
          onCommandSubmit={handleAiSubmit}
          isGenerating={isAiGenerating}
        />

        {/* Live voice widget */}
        <div className="absolute bottom-6 left-6 w-64 bg-h_bg_card/90 backdrop-blur-md rounded-xl border border-[#2a2a2a] overflow-hidden shadow-2xl pointer-events-none z-20">
          <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="text-[10px] font-semibold text-h_text_secondary uppercase tracking-widest">
              Live Voice
            </span>
            <div className="w-2 h-2 bg-h_accent rounded-full animate-pulse shadow-[0_0_8px_rgba(209,254,23,0.7)]"/>
          </div>
          <div className="px-4 py-3 flex items-center gap-2 text-h_text_secondary text-xs">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            Waiting for connection…
          </div>
        </div>

      </main>
    </div>
  );
};
