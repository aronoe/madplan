"use client";

interface ShoppingHeaderProps {
  weekLabel: string;
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function ShoppingHeader({
  weekLabel,
  weekOffset,
  onPrev,
  onNext,
  onToday,
}: ShoppingHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <h1 style={{ color: "var(--c-text-dark)", fontSize: 26, fontWeight: 800, margin: 0 }}>
        🛒 Indkøbsliste
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onPrev} style={navBtnStyle}>← Forrige</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text-mid)", minWidth: 140, textAlign: "center" }}>
          {weekLabel}
        </span>
        <button onClick={onNext} style={navBtnStyle}>Næste →</button>
        {weekOffset !== 0 && (
          <button onClick={onToday} style={{ ...navBtnStyle, color: "#4caf82" }}>I dag</button>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "var(--c-card-bg)",
  border: "1.5px solid var(--c-border)",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--c-text-mid)",
};
