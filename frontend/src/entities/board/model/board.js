const createBoardItem = ({
  title,
  body,
  author,
  color = "sand",
  position,
  lane = "explore",
}) => ({
  id: crypto.randomUUID(),
  type: "sticky",
  title,
  body,
  author,
  color,
  lane,
  position,
});

export const createInitialBoardState = (sessionConfig) => ({
  id: crypto.randomUUID(),
  title: sessionConfig.sessionGoal || "Untitled session",
  lanes: ["explore", "insights", "next steps"],
  items: [
    createBoardItem({
      title: "How might we",
      body: sessionConfig.sessionGoal || "Define the brainstorming challenge",
      author: "System",
      color: "sky",
      lane: "explore",
      position: { x: 80, y: 110 },
    }),
    createBoardItem({
      title: "Agent role",
      body: `Persona: ${sessionConfig.persona}. The AI should act on canvas, not only chat.`,
      author: "System",
      color: "mint",
      lane: "insights",
      position: { x: 340, y: 110 },
    }),
  ],
});

export const addStickyNote = (boardState, draft) => ({
  ...boardState,
  items: [
    ...boardState.items,
    createBoardItem({
      title: draft.title || "Untitled note",
      body: draft.body || "Add more context",
      author: draft.author,
      color: draft.tone || "sand",
      lane: "explore",
      position: createNextPosition(boardState.items.length),
    }),
  ],
});

export const moveBoardItem = (boardState, itemId, position) => ({
  ...boardState,
  items: boardState.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          position,
        }
      : item,
  ),
});

export const applyAgentSuggestions = (boardState, suggestions) => ({
  ...boardState,
  items: [
    ...boardState.items,
    ...suggestions.map((suggestion, index) =>
      createBoardItem({
        title: suggestion.title,
        body: suggestion.body,
        author: "AI agent",
        color: suggestion.color,
        lane: index % 2 === 0 ? "insights" : "next steps",
        position: {
          x: 120 + (index % 2) * 280,
          y: 330 + Math.floor(index / 2) * 190,
        },
      }),
    ),
  ],
});

export const replaceBoardItems = (boardState, items) => ({
  ...boardState,
  items,
});

export const serializeBoardState = (boardState) => ({
  version: 1,
  title: boardState.title,
  lanes: boardState.lanes,
  items: boardState.items,
});

export const deserializeBoardState = (payload, fallbackBoardState) => {
  if (!payload || typeof payload !== "object") {
    return fallbackBoardState;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    id: payload.id || fallbackBoardState.id,
    title: payload.title || fallbackBoardState.title,
    lanes: Array.isArray(payload.lanes) && payload.lanes.length
      ? payload.lanes
      : fallbackBoardState.lanes,
    items: items.map((item, index) => ({
      id: item.id || crypto.randomUUID(),
      type: item.type || "sticky",
      title: item.title || `Imported note ${index + 1}`,
      body: item.body || "",
      author: item.author || "Remote user",
      color: item.color || "sand",
      lane: item.lane || "explore",
      position: {
        x: Number(item.position?.x ?? 80 + (index % 3) * 250),
        y: Number(item.position?.y ?? 110 + Math.floor(index / 3) * 190),
      },
    })),
  };
};

const createNextPosition = (index) => ({
  x: 80 + (index % 3) * 250,
  y: 110 + Math.floor(index / 3) * 190,
});
