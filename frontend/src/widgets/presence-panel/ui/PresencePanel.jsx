export const PresencePanel = ({ presence, activityFeed }) => (
  <section className="panel dock-section">
    <div className="panel-head">
      <h2>Live feed</h2>
      <p>People and activity.</p>
    </div>

    <div className="info-block">
      <h3>Presence</h3>
      {presence.length ? (
        <ul className="simple-list">
          {presence.map((member) => (
            <li key={member.id || member.name}>
              {member.name || member.email || `User ${member.id}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No one else yet.</p>
      )}
    </div>

    <div className="info-block">
      <h3>Feed</h3>
      {activityFeed.length ? (
        <ul className="activity-list">
          {activityFeed.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No activity yet.</p>
      )}
    </div>
  </section>
);
