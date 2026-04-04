import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createAgentActionPlan,
  createAgentBrainstormPack,
  createAgentMessage,
  defaultAgentSettings,
} from "../../../entities/agent";
import {
  addStickyNote,
  applyAgentSuggestions,
  createInitialBoardState,
  deserializeBoardState,
  moveBoardItem,
  replaceBoardItems,
  serializeBoardState,
} from "../../../entities/board";
import { PresencePanel } from "../../../widgets/presence-panel";
import { BrainstormBoard } from "../../../widgets/brainstorm-board";
import { ControlDock } from "../../../widgets/control-dock";
import { saveCanvasState } from "../../../shared/api/canvas";
import { fetchRoom, fetchVideoToken } from "../../../shared/api/platform";
import { createRoomConnection } from "../../../shared/api/realtime";

export const BrainstormRoomPage = ({
  sessionConfig,
  onEditSettings,
  onResetSession,
}) => {
  const { roomId: routeRoomId } = useParams();
  const effectiveRoomId = routeRoomId || sessionConfig.roomId;
  const [boardState, setBoardState] = useState(() =>
    createInitialBoardState(sessionConfig),
  );
  const [agentSettings, setAgentSettings] = useState(defaultAgentSettings);
  const [presence, setPresence] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [transportStatus, setTransportStatus] = useState("idle");
  const [transportMessage, setTransportMessage] = useState("");
  const [activityFeed, setActivityFeed] = useState([]);
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [pendingAgentPack, setPendingAgentPack] = useState(null);
  const [roomMeta, setRoomMeta] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const initialBoardState = useMemo(
    () => createInitialBoardState(sessionConfig),
    [sessionConfig],
  );

  useEffect(() => {
    setBoardState(initialBoardState);
  }, [initialBoardState]);

  useEffect(() => {
    if (!effectiveRoomId) {
      return;
    }

    const loadRoomMeta = async () => {
      const [roomResult, videoResult] = await Promise.all([
        fetchRoom({
          apiBaseUrl: sessionConfig.apiBaseUrl,
          token: sessionConfig.token,
          roomId: effectiveRoomId,
        }),
        fetchVideoToken({
          apiBaseUrl: sessionConfig.apiBaseUrl,
          token: sessionConfig.token,
          roomId: effectiveRoomId,
        }),
      ]);

      if (roomResult.ok) {
        setRoomMeta(roomResult.payload?.data || roomResult.payload);
      }

      if (videoResult.ok) {
        setVideoInfo(videoResult.payload);
      }
    };

    loadRoomMeta();
  }, [effectiveRoomId, sessionConfig.apiBaseUrl, sessionConfig.token]);

  useEffect(() => {
    const connection = createRoomConnection({
      roomId: effectiveRoomId,
      token: sessionConfig.token,
      apiBaseUrl: sessionConfig.apiBaseUrl,
      onReady: (info) => {
        setTransportStatus(info.connected ? "connected" : "stub");
        setTransportMessage(info.message);
      },
      onPresenceSync: (members) => {
        setPresence(members);
      },
      onCanvasUpdated: (payload) => {
        setBoardState((current) =>
          deserializeBoardState(
            payload?.canvas_state || payload?.state || payload,
            current,
          ),
        );
        setActivityFeed((current) => [
          {
            id: crypto.randomUUID(),
            type: "remote",
            title: "CanvasUpdated",
            description: "Canvas state arrived from the room.",
            payload,
          },
          ...current,
        ].slice(0, 12));
      },
      onCursorMoved: (payload) => {
        setActivityFeed((current) => [
          {
            id: crypto.randomUUID(),
            type: "cursor",
            title: ".cursor.moved",
            description: "Remote cursor movement detected.",
            payload,
          },
          ...current,
        ].slice(0, 12));

        if (!payload?.user) {
          return;
        }

        setRemoteCursors((current) => ({
          ...current,
          [payload.user.id || payload.user.name || crypto.randomUUID()]: payload,
        }));
      },
    });

    return () => connection.disconnect();
  }, [effectiveRoomId, initialBoardState, sessionConfig.apiBaseUrl, sessionConfig.token]);

  const boardSummary = useMemo(
    () => createAgentMessage(boardState, sessionConfig),
    [boardState, sessionConfig],
  );

  const addFeedItem = (item) => {
    setActivityFeed((current) => [item, ...current].slice(0, 12));
  };

  const handleAddHumanNote = (draft) => {
    setBoardState((current) =>
      addStickyNote(current, {
        title: draft.title,
        body: draft.body,
        author: sessionConfig.name || "Human teammate",
        tone: draft.tone,
      }),
    );

    addFeedItem({
      id: crypto.randomUUID(),
      type: "human",
      title: "Human idea added",
      description: draft.title || "Untitled idea",
      payload: draft,
    });
  };

  const handleMoveItem = (itemId, position) => {
    setBoardState((current) => moveBoardItem(current, itemId, position));
  };

  const handleGenerateAgentIdeas = () => {
    const plan = createAgentActionPlan({
      boardState,
      sessionConfig,
      agentSettings,
    });
    const generatedPack = createAgentBrainstormPack(plan);

    if (agentSettings.approvalMode === "review-first") {
      setPendingAgentPack(generatedPack);
      addFeedItem({
        id: crypto.randomUUID(),
        type: "agent",
        title: "Agent prepared suggestions",
        description: "Waiting for human approval before placement.",
        payload: generatedPack,
      });
      return;
    }

    setBoardState((current) => applyAgentSuggestions(current, generatedPack.items));
    addFeedItem({
      id: crypto.randomUUID(),
      type: "agent",
      title: "Agent placed new ideas",
      description: generatedPack.summary,
      payload: generatedPack,
    });
  };

  const handleOrganizeBoard = () => {
    const reorganized = boardState.items.map((item, index) => ({
      ...item,
      position: {
        x: 80 + (index % 3) * 250,
        y: 110 + Math.floor(index / 3) * 190,
      },
    }));

    setBoardState((current) => replaceBoardItems(current, reorganized));
    addFeedItem({
      id: crypto.randomUUID(),
      type: "agent",
      title: "Agent reorganized the board",
      description: "Ideas were clustered into a cleaner review layout.",
      payload: { itemCount: reorganized.length },
    });
  };

  const handleSaveBoard = async () => {
    setSaveState("saving");
    setSaveMessage("Saving current board JSON to the backend...");

    const result = await saveCanvasState({
      apiBaseUrl: sessionConfig.apiBaseUrl,
      roomId: sessionConfig.roomId,
      token: sessionConfig.token,
      canvasState: serializeBoardState(boardState),
    });

    setSaveState(result.ok ? "saved" : "error");
    setSaveMessage(result.message);
  };

  const handleApproveAgentPack = () => {
    if (!pendingAgentPack) {
      return;
    }

    setBoardState((current) => applyAgentSuggestions(current, pendingAgentPack.items));
    addFeedItem({
      id: crypto.randomUUID(),
      type: "agent",
      title: "Agent suggestions approved",
      description: pendingAgentPack.summary,
      payload: pendingAgentPack,
    });
    setPendingAgentPack(null);
  };

  const handleDismissAgentPack = () => {
    if (!pendingAgentPack) {
      return;
    }

    addFeedItem({
      id: crypto.randomUUID(),
      type: "human",
      title: "Agent suggestions dismissed",
      description: "Human reviewer chose not to place the proposed notes.",
      payload: pendingAgentPack,
    });
    setPendingAgentPack(null);
  };

  return (
    <main className="room-page">
      <section className="room-hero panel">
        <div>
          <p className="eyebrow">Live canvas</p>
          <h1>{roomMeta?.name || sessionConfig.roomName || effectiveRoomId}</h1>
          <p className="hero-copy room-copy">{sessionConfig.sessionGoal}</p>
          <div className="hero-badge-row room-badges">
            <span className="hero-badge">AI on board</span>
            <span className="hero-badge">{sessionConfig.persona}</span>
            <span className="hero-badge">dark mode</span>
          </div>
        </div>
        <div className="session-stat-grid">
          <div className="stat-card">
            <span>Transport</span>
            <strong>{transportStatus}</strong>
            <p>{transportMessage}</p>
          </div>
          <div className="stat-card">
            <span>Saved state</span>
            <strong>{saveState}</strong>
            <p>{saveMessage || "Not saved yet."}</p>
          </div>
          <div className="stat-card">
            <span>Canvas objects</span>
            <strong>{boardState.items.length}</strong>
            <p>Ideas on board</p>
          </div>
          <div className="stat-card">
            <span>Video token</span>
            <strong>{videoInfo?.token ? "ready" : "unavailable"}</strong>
            <p>{videoInfo?.livekit_url || "LiveKit URL not returned yet."}</p>
          </div>
        </div>
      </section>

      <section className="room-layout">
        <div className="room-main">
          <BrainstormBoard
            boardState={boardState}
            remoteCursors={remoteCursors}
            onMoveItem={handleMoveItem}
          />
        </div>

        <aside className="room-sidebar">
          <ControlDock
            sessionConfig={sessionConfig}
            agentSettings={agentSettings}
            boardSummary={boardSummary}
            pendingAgentPack={pendingAgentPack}
            onAgentSettingsChange={setAgentSettings}
            onAddHumanNote={handleAddHumanNote}
            onGenerateAgentIdeas={handleGenerateAgentIdeas}
            onOrganizeBoard={handleOrganizeBoard}
            onApproveAgentPack={handleApproveAgentPack}
            onDismissAgentPack={handleDismissAgentPack}
            onSaveBoard={handleSaveBoard}
            onEditSettings={onEditSettings}
            onResetSession={onResetSession}
          />
          <PresencePanel presence={presence} activityFeed={activityFeed} />
        </aside>
      </section>
    </main>
  );
};
