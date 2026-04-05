import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { Room, RoomEvent, Track } from "livekit-client";
import { Canva } from "../../../widgets/Canva";
import { FloatingAICommand } from "../../../widgets/floating-ai-command";
import { chatWithRoomAi, fetchRoom, fetchVideoToken } from "../../../shared/api/platform";
import { saveCanvasState as apiSaveCanvasState } from "../../../shared/api/canvas";
import { createRoomConnection } from "../../../shared/api/realtime";

const clearContainer = (container) => {
  if (!container) {
    return;
  }

  try {
    container.replaceChildren();
  } catch {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
};

const getUserMediaErrorMessage = (error) => {
  if (!error) {
    return "Failed to access camera and microphone.";
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Browser blocked camera or microphone access. Allow permissions and try again.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "Camera or microphone device was not found.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Camera or microphone is already being used by another app.";
  }

  if (error.name === "SecurityError") {
    return "Camera access is blocked in this browser context. Open the app on localhost or HTTPS.";
  }

  return error.message || "Failed to access camera and microphone.";
};

const getLocalVideoTrack = (room) => {
  if (!room) {
    return null;
  }

  for (const publication of room.localParticipant.videoTrackPublications.values()) {
    if (publication.track) {
      return publication.track;
    }
  }

  return null;
};

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
  const [callStatus, setCallStatus] = useState("idle");
  const [callMessage, setCallMessage] = useState("Video call is not connected.");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);

  const [remoteCursors, setRemoteCursors] = useState({});
  const connectionRef = useRef(null);
  const localMediaRef = useRef(null);
  const remoteMediaRef = useRef(null);
  const audioMediaRef = useRef(null);
  const liveRoomRef = useRef(null);
  const previewStreamRef = useRef(null);
  const remoteElementsRef = useRef(new Map());

  const stopPreviewStream = useCallback(() => {
    if (!previewStreamRef.current) {
      return;
    }

    previewStreamRef.current.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
  }, []);

  const cleanupVideoMedia = useCallback(() => {
    stopPreviewStream();
    clearContainer(localMediaRef.current);
    clearContainer(remoteMediaRef.current);
    clearContainer(audioMediaRef.current);
    remoteElementsRef.current.forEach((element, key) => {
      try {
        element.remove();
      } catch {
        remoteElementsRef.current.delete(key);
      }
    });
    remoteElementsRef.current.clear();
  }, [stopPreviewStream]);

  const syncRemoteCount = useCallback((room) => {
    if (!room) {
      setRemoteParticipantCount(0);
      return;
    }

    const count = Array.from(room.remoteParticipants.values()).filter(
      (participant) => !participant.isAgent,
    ).length;
    setRemoteParticipantCount(count);
  }, []);

  const attachLocalTrack = useCallback((track) => {
    if (!track || !localMediaRef.current) {
      return;
    }

    clearContainer(localMediaRef.current);
    const element = track.attach();
    element.className = "h-full w-full object-cover";
    element.muted = true;
    localMediaRef.current.appendChild(element);
  }, []);

  const attachLocalPreviewStream = useCallback((stream) => {
    if (!stream || !localMediaRef.current) {
      return;
    }

    clearContainer(localMediaRef.current);
    const element = document.createElement("video");
    element.className = "h-full w-full object-cover";
    element.autoplay = true;
    element.playsInline = true;
    element.muted = true;
    element.srcObject = stream;
    localMediaRef.current.appendChild(element);
    previewStreamRef.current = stream;
  }, []);

  const attachPublishedLocalTrack = useCallback((room, publication) => {
    if (publication?.track) {
      attachLocalTrack(publication.track);
      return true;
    }

    const fallbackTrack = getLocalVideoTrack(room);

    if (fallbackTrack) {
      attachLocalTrack(fallbackTrack);
      return true;
    }

    return false;
  }, [attachLocalTrack]);

  const attachRemoteTrack = useCallback((track, participantIdentity) => {
    if (!track) {
      return;
    }

    const trackKey = `${participantIdentity}-${track.sid}`;
    const element = track.attach();

    if (track.kind === Track.Kind.Video) {
      element.className = "h-full w-full object-cover";
      const wrapper = document.createElement("div");
      wrapper.className =
        "relative min-h-[170px] overflow-hidden rounded-[20px] border border-white/10 bg-[#131313] shadow-[0_16px_40px_rgba(0,0,0,0.28)]";
      wrapper.dataset.trackKey = trackKey;
      wrapper.appendChild(element);

      const label = document.createElement("div");
      label.className =
        "absolute left-3 top-3 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/85 backdrop-blur";
      label.textContent = participantIdentity;
      wrapper.appendChild(label);

      remoteMediaRef.current?.appendChild(wrapper);
      remoteElementsRef.current.set(trackKey, wrapper);
      return;
    }

    element.autoplay = true;
    audioMediaRef.current?.appendChild(element);
    remoteElementsRef.current.set(trackKey, element);
  }, []);

  const detachRemoteTrack = useCallback((track, participantIdentity) => {
    if (!track) {
      return;
    }

    const trackKey = `${participantIdentity}-${track.sid}`;
    const element = remoteElementsRef.current.get(trackKey);

    if (element) {
      try {
        track.detach();
      } catch {
        // noop
      }
      element.remove();
      remoteElementsRef.current.delete(trackKey);
    }
  }, []);

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

  useEffect(() => {
    return () => {
      if (liveRoomRef.current) {
        liveRoomRef.current.disconnect();
      }
      cleanupVideoMedia();
    };
  }, [cleanupVideoMedia]);

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

  const startWebcamPreview = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    attachLocalPreviewStream(stream);
    setCameraEnabled(true);
    setMicEnabled(true);
    return stream;
  }, [attachLocalPreviewStream]);

  const disconnectCall = useCallback(() => {
    const room = liveRoomRef.current;

    if (room) {
      room.disconnect();
      liveRoomRef.current = null;
    }

    cleanupVideoMedia();
    setCallStatus("idle");
    setCallMessage("Video call is not connected.");
    setCameraEnabled(false);
    setMicEnabled(false);
    setRemoteParticipantCount(0);
  }, [cleanupVideoMedia]);

  const joinCall = useCallback(async () => {
    if (!roomId) {
      setCallStatus("error");
      setCallMessage("Room id is missing.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCallStatus("error");
      setCallMessage("This browser cannot access camera devices. Use a modern browser on localhost or HTTPS.");
      return;
    }

    setCallStatus("connecting");
    setCallMessage("Checking camera and microphone access...");

    try {
      await startWebcamPreview();
    } catch (error) {
      setCallStatus("error");
      setCallMessage(getUserMediaErrorMessage(error));
      return;
    }

    const tokenResult = await fetchVideoToken({
      apiBaseUrl: sessionConfig?.apiBaseUrl,
      token: sessionConfig?.token,
      roomId,
    });

    if (!tokenResult.ok) {
      setCallStatus("error");
      setCallMessage(tokenResult.message || "Failed to request video token.");
      return;
    }

    const videoToken = tokenResult.payload?.token;
    const livekitUrl = tokenResult.payload?.livekit_url;

    if (!videoToken || !livekitUrl) {
      setCallStatus("error");
      setCallMessage("Backend returned incomplete video credentials.");
      return;
    }

    const room = new Room();

    room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
      if (
        participant.identity === room.localParticipant.identity &&
        publication.kind === Track.Kind.Video
      ) {
        attachPublishedLocalTrack(room, publication);
      }
    });

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      attachRemoteTrack(track, participant.identity);
      syncRemoteCount(room);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      detachRemoteTrack(track, participant.identity);
      syncRemoteCount(room);
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      syncRemoteCount(room);
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      syncRemoteCount(room);
    });

    room.on(RoomEvent.Disconnected, () => {
      cleanupVideoMedia();
      liveRoomRef.current = null;
      setCallStatus("idle");
      setCallMessage("Call ended.");
      setCameraEnabled(false);
      setMicEnabled(false);
      setRemoteParticipantCount(0);
    });

    try {
      await room.connect(livekitUrl, videoToken);
      liveRoomRef.current = room;

      await room.startAudio();
      stopPreviewStream();
      const localVideoPublication = await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      attachPublishedLocalTrack(room, localVideoPublication);

      Array.from(room.remoteParticipants.values()).forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track) {
            attachRemoteTrack(publication.track, participant.identity);
          }
        });
      });

      setCallStatus("connected");
      setCallMessage("Connected to Live Voice.");
      setCameraEnabled(true);
      setMicEnabled(true);
      syncRemoteCount(room);
    } catch (error) {
      room.disconnect();
      liveRoomRef.current = null;
      setCallStatus("error");
      setCallMessage(
        `Webcam is available, but the room connection failed: ${error.message || "Failed to connect to call."}`,
      );
    }
  }, [
    roomId,
    sessionConfig?.apiBaseUrl,
    sessionConfig?.token,
    startWebcamPreview,
    attachPublishedLocalTrack,
    attachRemoteTrack,
    detachRemoteTrack,
    syncRemoteCount,
    cleanupVideoMedia,
    stopPreviewStream,
  ]);

  const toggleCamera = useCallback(async () => {
    const room = liveRoomRef.current;

    if (!room) {
      return;
    }

    try {
      const nextState = !cameraEnabled;
      const publication = await room.localParticipant.setCameraEnabled(nextState);

      if (nextState) {
        attachPublishedLocalTrack(room, publication);
      } else {
        clearContainer(localMediaRef.current);
      }

      setCameraEnabled(nextState);
    } catch (error) {
      setCallMessage(getUserMediaErrorMessage(error));
    }
  }, [cameraEnabled, attachPublishedLocalTrack]);

  const toggleMicrophone = useCallback(async () => {
    const room = liveRoomRef.current;

    if (!room) {
      return;
    }

    try {
      const nextState = !micEnabled;
      await room.localParticipant.setMicrophoneEnabled(nextState);
      setMicEnabled(nextState);
    } catch (error) {
      setCallMessage(getUserMediaErrorMessage(error));
    }
  }, [micEnabled]);

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

        <div className="absolute bottom-6 left-6 z-20 flex h-[26rem] w-[27rem] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#1a1a1a]/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#131313]/80 px-4 py-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7b7b]">
                Live Voice
              </span>
              <p className="mt-1 text-[11px] text-[#7b7b7b]">{callMessage}</p>
            </div>
            <div
              className={
                callStatus === "connected"
                  ? "h-2.5 w-2.5 rounded-full bg-[#d1fe17] shadow-[0_0_10px_rgba(209,254,23,0.85)]"
                  : callStatus === "connecting"
                    ? "h-2.5 w-2.5 animate-pulse rounded-full bg-[#d1fe17]"
                    : "h-2.5 w-2.5 rounded-full bg-[#7b7b7b]"
              }
            />
          </div>

          <div className="grid flex-1 gap-3 p-3">
            <div className="grid min-h-[160px] grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#131313]">
                <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#7b7b7b]">
                  You
                </div>
                <div className="relative h-[150px] bg-[#131313]">
                  <div ref={localMediaRef} className="absolute inset-0" />
                  {!cameraEnabled ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-[#7b7b7b]">
                      Camera off
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#131313]">
                <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#7b7b7b]">
                  Remote
                </div>
                <div className="relative h-[150px] bg-[#131313]">
                  <div
                    ref={remoteMediaRef}
                    className="grid h-full auto-rows-fr gap-2 p-2"
                  />
                  {!remoteParticipantCount ? (
                    <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-[#7b7b7b]">
                      Waiting for colleagues...
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div ref={audioMediaRef} className="hidden" />

            <div className="rounded-[18px] border border-white/10 bg-[#131313]/90 p-3">
              <div className="mb-3 flex items-center justify-between text-xs text-[#7b7b7b]">
                <span>Participants</span>
                <span>{remoteParticipantCount + (callStatus === "connected" ? 1 : 0)}</span>
              </div>

	              <div className="grid grid-cols-2 gap-2">
	                {callStatus === "connected" ? (
	                  <>
	                    <button
	                      type="button"
	                      onClick={toggleMicrophone}
	                      className={
	                        micEnabled
	                          ? "flex items-center justify-center rounded-2xl bg-[#d1fe17] px-3 py-2.5 text-[#131313] transition hover:opacity-90"
	                          : "flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[#fefefe] transition hover:border-[#d1fe17]/40 hover:bg-[#d1fe17]/10"
	                      }
	                      aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
	                    >
	                      {micEnabled ? (
	                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
	                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
	                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
	                          <line x1="12" y1="19" x2="12" y2="23"/>
	                          <line x1="8" y1="23" x2="16" y2="23"/>
	                        </svg>
	                      ) : (
	                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
	                          <path d="M12 1a3 3 0 0 0-3 3v4"/>
	                          <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
	                          <path d="M19 10v2a7 7 0 0 1-12.48 4.48"/>
	                          <line x1="12" y1="19" x2="12" y2="23"/>
	                          <line x1="8" y1="23" x2="16" y2="23"/>
	                          <line x1="3" y1="3" x2="21" y2="21"/>
	                        </svg>
	                      )}
	                    </button>
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={
                        cameraEnabled
                          ? "rounded-2xl bg-[#d1fe17] px-3 py-2.5 text-xs font-semibold text-[#131313] transition hover:opacity-90"
                          : "rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-[#fefefe] transition hover:border-[#d1fe17]/40 hover:bg-[#d1fe17]/10"
                      }
                    >
                      {cameraEnabled ? "Stop cam" : "Start cam"}
                    </button>
                    <button
                      type="button"
                      onClick={disconnectCall}
                      className="col-span-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-[#fefefe] transition hover:border-[#d1fe17]/30 hover:bg-white/10"
                    >
                      Leave call
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={joinCall}
                    className="col-span-2 rounded-2xl bg-[#d1fe17] px-3 py-3 text-xs font-semibold text-[#131313] shadow-[0_0_18px_rgba(209,254,23,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(209,254,23,0.26)]"
                  >
                    {callStatus === "connecting" ? "Connecting..." : "Join video call"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
