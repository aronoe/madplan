"use client";

import type { Recipe } from "@/lib/types";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

type Props = {
  dayIndex: number;
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
  onClose: () => void;
  onClear: () => void;
  onSwitch?: () => void;
  onViewRecipe: (recipeId: string) => void;
};

export default function DayDrawer({ dayIndex, meal, onClose, onClear, onSwitch, onViewRecipe }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 100,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 300,
          background: "var(--c-nav-bg)",
          boxShadow: "-4px 0 24px rgba(0,80,40,.12)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          padding: "24px 20px",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--c-text-muted)" }}>
            {DAGE[dayIndex]}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--c-text-muted)", lineHeight: 1, padding: 4 }}
            aria-label="Luk"
          >
            ×
          </button>
        </div>

        {meal ? (
          <>
            {/* Recipe card */}
            <div
              style={{
                background: "var(--c-active-bg)",
                borderRadius: 14,
                padding: "16px",
                border: "1.5px solid var(--c-border)",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{meal.emoji}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--c-text-dark)", marginBottom: 4 }}>
                {meal.name}
              </div>
              <div style={{ fontSize: 13, color: "var(--c-text-muted)" }}>
                ⏱ {meal.time_minutes} min
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => { onViewRecipe(meal.id); onClose(); }}
                style={drawerBtnStyle("#4caf82", "white")}
              >
                📖 Se opskrift
              </button>
              <button
                onClick={() => { onSwitch ? onSwitch() : onClose(); }}
                style={drawerBtnStyle("var(--c-input-bg)", "var(--c-text-mid)")}
              >
                🔄 Skift ret
              </button>
              <button
                onClick={() => { onClear(); onClose(); }}
                style={drawerBtnStyle("var(--c-input-bg)", "#c0392b")}
              >
                🗑 Fjern
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--c-text-muted)", fontSize: 14, gap: 8 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            Ingen ret planlagt
          </div>
        )}
      </div>
    </>
  );
}

function drawerBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: "1.5px solid var(--c-border)",
    borderRadius: 10,
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
  };
}
