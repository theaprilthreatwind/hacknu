import { useRef, useState } from "react";

const colorClassByTone = {
  sand: "sticky-sand",
  sky: "sticky-sky",
  mint: "sticky-mint",
  rose: "sticky-rose",
  amber: "sticky-amber",
  slate: "sticky-slate",
  coral: "sticky-coral",
  lime: "sticky-lime",
};

export const BrainstormBoard = ({ boardState, remoteCursors, onMoveItem }) => {
  const boardRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const frameRef = useRef(null);

  const handlePointerDown = (event, item) => {
    const boardBounds = boardRef.current?.getBoundingClientRect();

    if (!boardBounds) {
      return;
    }

    setDragState({
      itemId: item.id,
      offsetX: event.clientX - boardBounds.left - item.position.x,
      offsetY: event.clientY - boardBounds.top - item.position.y,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragState || !boardRef.current) {
      return;
    }

    const boardBounds = boardRef.current.getBoundingClientRect();
    const x = Math.max(20, event.clientX - boardBounds.left - dragState.offsetX);
    const y = Math.max(20, event.clientY - boardBounds.top - dragState.offsetY);

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      onMoveItem(dragState.itemId, { x, y });
      frameRef.current = null;
    });
  };

  const handlePointerUp = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    setDragState(null);
  };

  return (
    <section className="panel board-shell">
      <div className="panel-head">
        <h2>Spatial board</h2>
        <p>
          Functional board placeholder for the hackathon flow. Every AI action
          lands as positioned cards on the canvas.
        </p>
      </div>

      <div
        ref={boardRef}
        className="board-surface"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="board-lane" style={{ left: "6%" }}>
          <span>Explore</span>
        </div>
        <div className="board-lane" style={{ left: "38%" }}>
          <span>Insights</span>
        </div>
        <div className="board-lane" style={{ left: "70%" }}>
          <span>Next steps</span>
        </div>

        {boardState.items.map((item) => (
          <article
            key={item.id}
            className={`sticky-note ${colorClassByTone[item.color] || "sticky-sand"}`}
            style={{
              transform: `translate(${item.position.x}px, ${item.position.y}px)`,
            }}
            onPointerDown={(event) => handlePointerDown(event, item)}
          >
            <span className="sticky-author">{item.author}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}

        {Object.values(remoteCursors).map((cursor) => (
          <div
            key={cursor.user?.id || cursor.user?.name}
            className="remote-cursor"
            style={{
              transform: `translate(${cursor.x || 40}px, ${cursor.y || 40}px)`,
            }}
          >
            <span>{cursor.user?.name || "Guest"}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
