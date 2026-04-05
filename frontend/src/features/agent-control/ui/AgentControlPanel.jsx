export const AgentControlPanel = ({
  sessionConfig,
  agentSettings,
  boardSummary,
  onAgentSettingsChange,
  onGenerateAgentIdeas,
  onOrganizeBoard,
}) => {
  const handleSettingChange = (event) => {
    const { name, value } = event.target;

    onAgentSettingsChange((current) => ({
      ...current,
      [name]: name === "contributionLevel" ? Number(value) : value,
    }));
  };

  return (
    <section className="panel dock-section">
      <div className="panel-head">
        <h2>Agent</h2>
        <p>Control how it joins the session.</p>
      </div>

      <div className="info-chip-row">
        <span className="info-chip">{sessionConfig.persona}</span>
        <span className="info-chip">{agentSettings.approvalMode}</span>
        <span className="info-chip">level {agentSettings.contributionLevel}</span>
      </div>

      <label className="field">
        <span>Autonomy</span>
        <select
          className="field-input"
          name="autonomy"
          value={agentSettings.autonomy}
          onChange={handleSettingChange}
        >
          <option value="low">Low</option>
          <option value="balanced">Balanced</option>
          <option value="high">High</option>
        </select>
      </label>

      <label className="field">
        <span>Contribution level</span>
        <input
          name="contributionLevel"
          type="range"
          min="1"
          max="4"
          value={agentSettings.contributionLevel}
          onChange={handleSettingChange}
        />
      </label>

      <label className="field">
        <span>Approval mode</span>
        <select
          className="field-input"
          name="approvalMode"
          value={agentSettings.approvalMode}
          onChange={handleSettingChange}
        >
          <option value="review-first">Review first</option>
          <option value="auto-place">Auto place</option>
        </select>
      </label>

      <label className="field">
        <span>Focus prompt</span>
        <textarea
          name="focusPrompt"
          rows="4"
          placeholder="Tell the agent what to focus on in this session"
          value={agentSettings.focusPrompt}
          onChange={handleSettingChange}
        />
      </label>

      <div className="summary-box">
        <strong>Context</strong>
        <p>{boardSummary}</p>
      </div>

      <div className="stack-actions">
        <button className="primary-button" type="button" onClick={onGenerateAgentIdeas}>
          Generate
        </button>
        <button className="ghost-button" type="button" onClick={onOrganizeBoard}>
          Organize
        </button>
      </div>
    </section>
  );
};
