import { useState } from "react";

const initialDraft = {
  title: "",
  body: "",
  tone: "sand",
};

export const HumanNoteComposer = ({ onSubmit }) => {
  const [draft, setDraft] = useState(initialDraft);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setDraft((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(draft);
    setDraft(initialDraft);
  };

  return (
    <section className="panel dock-section">
      <div className="panel-head">
        <h2>New note</h2>
        <p>Add an idea.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            type="text"
            placeholder="Idea title"
            value={draft.title}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Idea note</span>
          <textarea
            name="body"
            rows="4"
            placeholder="Write the note"
            value={draft.body}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Visual tone</span>
          <select
            className="field-input"
            name="tone"
            value={draft.tone}
            onChange={handleChange}
          >
            <option value="sand">Sand</option>
            <option value="sky">Sky</option>
            <option value="mint">Mint</option>
            <option value="rose">Rose</option>
            <option value="amber">Amber</option>
            <option value="slate">Slate</option>
          </select>
        </label>

        <button className="primary-button" type="submit">
          Add note
        </button>
      </form>
    </section>
  );
};
