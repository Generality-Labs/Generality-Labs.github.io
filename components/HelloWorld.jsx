// Demo component proving the pipeline: JSX, hooks, house tokens. Delete once
// a real component exists.
import { useState } from "react";

const box = {
  fontFamily: '"Geist", "Inter", system-ui, sans-serif',
  border: "1px solid var(--hairline, #e6e6e6)",
  borderRadius: "12px",
  padding: "0.9rem 1.2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  background: "#fff",
};

const btn = {
  background: "transparent",
  color: "var(--mint-deep, #24857a)",
  border: "1px solid var(--mint-edge, #c5e8e1)",
  borderRadius: "999px",
  padding: "0.4rem 0.95rem",
  font: "inherit",
  fontSize: "0.85rem",
  cursor: "pointer",
};

export function HelloWorld({ start = 0 }) {
  const [n, setN] = useState(start);
  return (
    <div style={box}>
      <span>
        React island — clicked <b>{n}</b> time{n === 1 ? "" : "s"}
      </span>
      <button style={btn} onClick={() => setN(n + 1)}>
        +1
      </button>
    </div>
  );
}
