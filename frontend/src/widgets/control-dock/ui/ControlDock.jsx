import { AgentControlPanel } from "../../../features/agent-control";
import { HumanNoteComposer } from "../../../features/human-note";

export const ControlDock = ({
  sessionConfig,
  agentSettings,
  boardSummary,
  pendingAgentPack,
  onAgentSettingsChange,
  onAddHumanNote,
  onGenerateAgentIdeas,
  onOrganizeBoard,
  onApproveAgentPack,
  onDismissAgentPack,
  onSaveBoard,
  onEditSettings,
  onResetSession,
}) => (
  <div className="control-dock">
    <HumanNoteComposer onSubmit={onAddHumanNote} />
    <AgentControlPanel
      sessionConfig={sessionConfig}
      agentSettings={agentSettings}
      boardSummary={boardSummary}
      onAgentSettingsChange={onAgentSettingsChange}
      onGenerateAgentIdeas={onGenerateAgentIdeas}
      onOrganizeBoard={onOrganizeBoard}
    />
    {pendingAgentPack ? (
      <section className="panel dock-section">
        <div className="panel-head">
          <h2>Pending agent suggestions</h2>
          <p>{pendingAgentPack.summary}</p>
        </div>
        <ul className="activity-list">
          {pendingAgentPack.items.map((item) => (
            <li key={item.title + item.body}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="stack-actions">
          <button className="primary-button" type="button" onClick={onApproveAgentPack}>
            Approve and place on board
          </button>
          <button className="ghost-button" type="button" onClick={onDismissAgentPack}>
            Dismiss suggestions
          </button>
        </div>
      </section>
    ) : null}
    <section className="panel dock-section">
      <div className="panel-head">
        <h2>Session actions</h2>
        <p>Core actions for the live demo flow.</p>
      </div>
      <div className="stack-actions">
        <button className="primary-button" type="button" onClick={onSaveBoard}>
          Save board JSON
        </button>
        <button className="ghost-button" type="button" onClick={onEditSettings}>
          Edit room settings
        </button>
        <button className="ghost-button danger-button" type="button" onClick={onResetSession}>
          Clear token
        </button>
      </div>
    </section>
  </div>
);
