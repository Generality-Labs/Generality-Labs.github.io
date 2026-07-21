// Arrow-function torture test — deliberately everything qreacto's Babel
// setup documents as unsupported: an arrow-function component, arrow event
// handlers, arrows inside .map, and a named export (imported by name in
// index.jsx). If this renders and clicks, the esbuild pipeline is fine.
import { useState } from "react";

const chip = (active) => ({
  background: active ? "var(--mint-soft, #ecf8f5)" : "transparent",
  color: "var(--mint-deep, #24857a)",
  border: "1px solid var(--mint-edge, #c5e8e1)",
  borderRadius: "999px",
  padding: "0.35rem 0.85rem",
  font: "inherit",
  fontSize: "0.85rem",
  cursor: "pointer",
});

export const ArrowDemo = ({
  items = ["arrows", "named exports", "JSX"],
  label = (w) => w, // function prop: transforms chip labels
  onPick, // function prop: notified on every pick
}) => {
  const [picked, setPicked] = useState(null);
  return (
    <div
      style={{
        fontFamily: '"Geist", "Inter", system-ui, sans-serif',
        border: "1px solid var(--hairline, #e6e6e6)",
        borderRadius: "12px",
        padding: "0.9rem 1.2rem",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.6rem",
        background: "#fff",
      }}
    >
      {items.map((w) => (
        <button
          key={w}
          style={chip(picked === w)}
          onClick={() => {
            setPicked(w);
            onPick?.(w);
          }}
        >
          {label(w)}
        </button>
      ))}
      <span style={{ fontSize: "0.9rem", color: "var(--muted, #5b5858)" }}>
        {picked ? `works: ${label(picked)}` : "click one —"}
      </span>
    </div>
  );
};
