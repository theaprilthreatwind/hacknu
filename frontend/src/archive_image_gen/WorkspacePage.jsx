import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { Canva } from "../../../widgets/Canva";
import { FloatingAICommand } from "../../../widgets/floating-ai-command";
import { generateRoomMedia, fetchRoom, fetchGenerationStatus } from "../../../shared/api/platform";
import { generateHiggsfieldVideo } from "../../../shared/api/media";
import { saveCanvasState as apiSaveCanvasState } from "../../../shared/api/canvas";
import { createRoomConnection } from "../../../shared/api/realtime";
import { LiveVoiceWidget } from "../../../widgets/live-voice/LiveVoiceWidget";

// ─── Tool definitions ─────────────────────────────────────────────
const TOOLS = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3l14 9-7 1-4 7-3-17z" />
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 7V5h16v2" /><path d="M12 5v14" /><path d="M9 19h6" />
      </svg>
    ),
  },
  {
    id: 'image',
    label: 'Image',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  { id: 'divider', label: '', icon: null },
  {
    id: 'generate',
    label: 'Generate',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    accent: true,
  },
];

// ─── Figma-style top toolbar ──────────────────────────────────────
const TopToolbar = ({ activeTool, onToolSelect }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-xl">
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
            'relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-150',
            isActive
              ? 'bg-h_accent/10 text-h_accent shadow-[0_0_12px_rgba(209,254,23,0.1)]'
              : isAccent
                ? 'text-h_accent/70 hover:text-h_accent hover:bg-h_accent/10'
                : 'text-neutral-400 hover:text-white hover:bg-white/5',
          ].join(' ')}
        >
          {tool.icon}
          <span className="text-[10px] font-medium tracking-wide leading-none mt-0.5">
            {tool.label}
          </span>
          {isActive && (
            <span className="absolute bottom-0 w-1 h-1 rounded-full bg-h_accent" />
          )}
        </button>
      );
    })}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────
export const WorkspacePage = ({ sessionConfig }) => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const guestId = useMemo(() => Math.random().toString(36).substring(7), []);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [roomData, setRoomData] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

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

  // ── Video Generation Logic (Step 1: Start, Step 2: Polling) ──────
  const startVideoGeneration = async (roomId, prompt, imageUrl, targetNodeId) => {
    const apiBaseUrl = sessionConfig?.apiBaseUrl || 'http://127.0.0.1:8000';
    const token = sessionConfig?.token;

    try {
      console.log("Шаг 1: Запуск генерации (через platform API)...");
      const startData = await generateRoomMedia({
        apiBaseUrl,
        token,
        roomId,
        prompt,
        type: 'video',
        imageUrl
      });

      const requestId = startData.request_id || startData.payload?.request_id;
      if (!requestId) throw new Error("No request_id returned from Higgsfield");

      console.log("Шаг 2: Начинаем Polling для request_id:", requestId);

      const pollInterval = setInterval(async () => {
        try {
          const statusData = await fetchGenerationStatus({
            apiBaseUrl,
            token,
            roomId,
            requestId
          });

          const status = statusData.status || statusData.payload?.status;

          if (status === 'completed') {
            clearInterval(pollInterval);
            const videoUrl = statusData.video?.url || statusData.payload?.video?.url;
            console.log("Видео готово! Ссылка:", videoUrl);

            setNodes((nds) => nds.map((n) => n.id === targetNodeId ? {
              ...n,
              type: 'higgsfieldVideo',
              data: { ...n.data, video_url: videoUrl, isGeneratingMedia: false }
            } : n));
          } else if (status === 'failed' || status === 'nsfw') {
            clearInterval(pollInterval);
            console.error("Ошибка генерации Higgsfield:", status);
            setNodes((nds) => nds.map((n) => n.id === targetNodeId ? { ...n, data: { ...n.data, isGeneratingMedia: false } } : n));
          } else {
            console.log("Генерация в процессе. Полный ответ:", statusData);
          }
        } catch (pollErr) {
          console.error("Ошибка при поллинге:", pollErr);
        }
      }, 4000);

    } catch (error) {
      console.error("Ошибка при старте генерации:", error);
      setNodes((nds) => nds.map((n) => n.id === targetNodeId ? { ...n, data: { ...n.data, isGeneratingMedia: false } } : n));
    }
  };

  // onConnect: wires nodes + triggers Image-to-Video pipeline
  const onConnect = useCallback(
    async (params) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      console.log("ONCONNECT TRIGGERED. Source:", sourceNode?.type, "Target:", targetNode?.type);

      // Ищем ссылку на картинку в любых возможных полях
      const imageUrl = sourceNode?.data?.image_url || sourceNode?.data?.url || sourceNode?.data?.image;

      // Если есть картинка и есть куда её воткнуть - запускаем!
      if (imageUrl && targetNode) {
        console.log("Железобетонное условие выполнено! Запускаем Image-to-Video...");

        // 1. Рисуем стрелку
        setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#d1fe17', strokeWidth: 1.5 } }, eds));

        // 2. Сразу меняем статус Target ноды на загрузку
        setNodes((nds) => nds.map(n => n.id === targetNode.id ? {
          ...n,
          data: { ...n.data, isGeneratingMedia: true, status: 'generating' }
        } : n));

        // 3. Вызываем функцию генерации
        startVideoGeneration(
          roomId,
          targetNode.data?.content || targetNode.data?.prompt || "Animate this",
          imageUrl,
          targetNode.id
        );
        return;
      }

      // Fallback for regular connections
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: '#d1fe17', strokeWidth: 1.5 } },
          eds
        )
      );
    },
    [nodes, setNodes, setEdges, sessionConfig, roomId]
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
        setRoomData(payload);

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

  // 2. Debounced canvas auto-save
  useEffect(() => {
    if (!isHydrated || !roomId || nodes.length === 0) return;

    const timeoutId = setTimeout(() => {
      handleSaveCanvas(nodes, edges);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, roomId, isHydrated]);

  const handleSaveCanvas = async (currentNodes, currentEdges) => {
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
  };

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

      // Защита от спама при ошибках API (особенно 429 Too Many Requests)
      if (aiData?.status === "error" || response?.status === 429) {
        alert(`Google AI просит подождать: превышен лимит запросов. Сделайте паузу на 1 минуту!`);
        return; // Прерываем выполнение, чтобы не сломать стейт
      }

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

  // ── Share link ──────────────────────────────────────────────────
  const handleShareClick = useCallback(() => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [roomId]);

  return (
    <div className="flex h-screen w-screen bg-h_black overflow-hidden font-sans text-h_text_primary">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-60 flex-shrink-0 bg-h_bg_card border-r border-[#2a2a2a] flex flex-col z-40">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-h_accent flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#131313" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-h_text_primary tracking-tight">
              Higgsfield Workspace
            </span>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

          {/* Back to Dashboard */}
          <button
            onClick={() => navigate('/hub')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-h_text_secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors mb-4"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>

          <p className="text-[10px] font-semibold text-h_text_secondary uppercase tracking-widest px-2 mb-2">
            Boards
          </p>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-h_accent/10 border border-h_accent/20 cursor-pointer transition-all hover:bg-h_accent/15">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-h_accent flex-shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span className="text-sm text-h_accent font-medium truncate">Main board</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#2a2a2a] space-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-h_accent animate-pulse shadow-[0_0_6px_rgba(209,254,23,0.7)]" />
            <span className="text-xs text-h_text_secondary">
              Live · {Object.keys(remoteCursors).length + 1} online
            </span>
          </div>
          <button
            onClick={handleShareClick}
            className={`w-full flex items-center justify-center gap-2 border py-2 px-4 rounded-xl text-xs font-semibold transition-all ${isCopied
                ? 'bg-h_accent/20 border-h_accent text-h_accent'
                : 'bg-h_accent/10 hover:bg-h_accent/20 border-h_accent/30 text-h_accent'
              }`}
          >
            {isCopied ? (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share link
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── MAIN CANVAS AREA ── */}
      <main className="flex-1 relative bg-h_bg_main overflow-hidden">

        {/* React Flow canvas */}
        <div className="absolute inset-0 z-0">
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

        {/* Figma-style top toolbar - Ensure high z-index and render last in main to be on top */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100]">
          <TopToolbar activeTool={activeTool} onToolSelect={setActiveTool} />
        </div>

        {/* Floating AI prompt bar */}
        <FloatingAICommand
          onCommandSubmit={handleAiSubmit}
          isGenerating={isAiGenerating}
        />

        {/* Live voice widget */}
        <div className="absolute bottom-6 left-6 z-50">
          <LiveVoiceWidget
            roomId={roomId}
            apiBaseUrl={sessionConfig?.apiBaseUrl || 'http://127.0.0.1:8000/api'}
            token={sessionConfig?.token}
          />
        </div>

      </main>
    </div>
  );
};