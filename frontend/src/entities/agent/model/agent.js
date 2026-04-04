export const agentPersonaOptions = [
  {
    id: "strategist",
    label: "Strategist",
    voice: "Finds themes, gaps and positioning angles.",
  },
  {
    id: "provocateur",
    label: "Provocateur",
    voice: "Challenges assumptions and adds wild options.",
  },
  {
    id: "producer",
    label: "Producer",
    voice: "Turns fuzzy ideas into practical next steps.",
  },
];

export const defaultAgentSettings = {
  autonomy: "balanced",
  contributionLevel: 2,
  approvalMode: "review-first",
  focusPrompt: "",
};

const personaPrefixById = {
  strategist: "Theme",
  provocateur: "Disruption",
  producer: "Execution",
};

export const createAgentMessage = (boardState, sessionConfig) => {
  const recentTitles = boardState.items.slice(-3).map((item) => item.title);

  if (!recentTitles.length) {
    return `The board is empty. Start with a few human ideas about "${sessionConfig.sessionGoal}" so the agent can respond spatially.`;
  }

  return `Current focus: ${recentTitles.join(", ")}. Agent persona: ${sessionConfig.persona}.`;
};

export const createAgentActionPlan = ({
  boardState,
  sessionConfig,
  agentSettings,
}) => {
  const base = personaPrefixById[sessionConfig.persona] || "Insight";
  const ideaCount = Math.max(2, agentSettings.contributionLevel + 1);
  const anchor = boardState.items[boardState.items.length - 1];

  return {
    summary: `${base} agent prepared ${ideaCount} spatial suggestions for "${sessionConfig.sessionGoal}".`,
    items: Array.from({ length: ideaCount }, (_, index) => ({
      title: `${base} ${index + 1}`,
      body: buildIdeaBody({
        index,
        sessionGoal: sessionConfig.sessionGoal,
        autonomy: agentSettings.autonomy,
        anchorTitle: anchor?.title,
        focusPrompt: agentSettings.focusPrompt,
      }),
      color: buildPersonaColor(sessionConfig.persona, index),
    })),
  };
};

export const createAgentBrainstormPack = (plan) => ({
  summary: plan.summary,
  items: plan.items,
});

const buildIdeaBody = ({
  index,
  sessionGoal,
  autonomy,
  anchorTitle,
  focusPrompt,
}) => {
  const prompts = [
    `Explore a user pain hidden inside "${sessionGoal}".`,
    `Suggest one experiment the team can validate in a 10-minute session.`,
    `Highlight a risky assumption and propose a safer variant.`,
    `Turn the most interesting cluster into a demo story.`,
  ];
  const autonomyTail =
    autonomy === "high"
      ? "The agent can place this proactively."
      : "The agent should wait for human approval before expanding it.";

  return `${prompts[index % prompts.length]} ${focusPrompt ? `Human direction: ${focusPrompt}. ` : ""}${anchorTitle ? `Reference note: ${anchorTitle}. ` : ""}${autonomyTail}`;
};

const buildPersonaColor = (persona, index) => {
  const palettes = {
    strategist: ["mint", "sky", "sand"],
    provocateur: ["coral", "rose", "amber"],
    producer: ["slate", "lime", "sky"],
  };

  return palettes[persona]?.[index % 3] || "mint";
};
