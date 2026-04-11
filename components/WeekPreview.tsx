"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/types";
import type { Tempo } from "@/lib/autoSelect";
import { pickOneRecipe } from "@/lib/autoSelect";
import RecipePicker from "@/components/RecipePicker";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

type Props = {
  // Initial generated plan — index = day 0-6. May be shorter than 7.
  plan: Recipe[];
  // Full recipe library for per-day swaps
  allRecipes: Recipe[];
  selectedIngredients: string[];
  tempo: Tempo;
  // Soft warning shown when we got fewer recipes than requested
  warning: string | null;
  loading: boolean;
  onRegenerate: () => void;
  // Passes the full sparse plan (index = day 0–6, null = skipped day) back to caller.
  // Positional information is preserved so day 0 always maps to Mandag, etc.
  onApprove: (editedPlan: (Recipe | null)[]) => void;
};

export default function WeekPreview({
  plan,
  allRecipes,
  selectedIngredients,
  tempo,
  warning,
  loading,
  onRegenerate,
  onApprove,
}: Props) {
  // editPlan: sparse array indexed 0-6. null = day removed by user.
  const [editPlan, setEditPlan] = useState<(Recipe | null)[]>(() => plan);

  // Which slot has its RecipePicker open
  const [pickerForSlot, setPickerForSlot] = useState<number | null>(null);

  // Summary text
  const tempoLabel: Record<Tempo, string> = {
    hurtig: "hurtige",
    mix: "varierede",
    weekend: "hyggelige",
  };
  const summary = selectedIngredients.length > 0
    ? `Vi prioriterede retter med ${selectedIngredients.slice(0, 2).join(" og ")}.`
    : `Vi valgte ${plan.length} ${tempoLabel[tempo]} retter til din uge.`;

  function refreshSlot(index: number) {
    const usedIds = new Set(editPlan.filter(Boolean).map((r) => r!.id));
    const pick = pickOneRecipe(allRecipes, usedIds);
    if (pick) {
      setEditPlan((prev) => prev.map((r, i) => (i === index ? pick : r)));
    }
  }

  function removeSlot(index: number) {
    setEditPlan((prev) => prev.map((r, i) => (i === index ? null : r)));
  }

  function pickForSlot(recipe: Recipe, index: number) {
    setEditPlan((prev) => prev.map((r, i) => (i === index ? recipe : r)));
  }

  function addSlot() {
    // Append a random recipe at the first null slot or at the end (max 7)
    const nextNull = editPlan.indexOf(null);
    const usedIds = new Set(editPlan.filter(Boolean).map((r) => r!.id));
    const pick = pickOneRecipe(allRecipes, usedIds);
    if (!pick) return;
    if (nextNull !== -1) {
      setEditPlan((prev) => prev.map((r, i) => (i === nextNull ? pick : r)));
    } else if (editPlan.length < 7) {
      setEditPlan((prev) => [...prev, pick]);
    }
  }

  // plannedCount = non-null entries; finalPlan NOT used for saving (positions must be preserved)
  const plannedCount = editPlan.filter(Boolean).length;

  return (
    <>
      <div
        style={{
          background: "var(--c-card-bg)",
          borderRadius: 20,
          boxShadow: "0 2px 16px rgba(0,80,40,.10)",
          padding: "28px 24px",
          width: "100%",
          maxWidth: 500,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text-dark)", margin: "0 0 4px" }}>
            🍽️ Din ugeplan
          </h2>
          <p style={{ fontSize: 14, color: "var(--c-text-mid)", margin: 0 }}>{summary}</p>
        </div>

        {/* Soft warning if fewer recipes than days requested */}
        {warning && (
          <div
            style={{
              background: "#fffbe6",
              border: "1.5px solid #f0d060",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#7a5c00",
              marginBottom: 16,
            }}
          >
            ⚠️ {warning}
          </div>
        )}

        {/* Day rows — editable */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {Array.from({ length: Math.max(editPlan.length, 1) }, (_, i) => {
            const recipe = editPlan[i] ?? null;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: recipe ? "var(--c-active-bg)" : "var(--c-input-bg)",
                  borderRadius: 10,
                  border: recipe
                    ? "1.5px solid var(--c-border)"
                    : "1.5px dashed var(--c-border)",
                  opacity: recipe ? 1 : 0.6,
                  minHeight: 48,
                }}
              >
                {/* Day label */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--c-text-muted)",
                    minWidth: 50,
                    letterSpacing: 0.4,
                  }}
                >
                  {DAGE[i]}
                </span>

                {recipe ? (
                  <>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{recipe.emoji}</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--c-text-dark)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {recipe.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--c-text-muted)", flexShrink: 0 }}>
                      {recipe.time_minutes} min
                    </span>
                  </>
                ) : (
                  <span style={{ flex: 1, fontSize: 13, color: "var(--c-text-muted)", fontStyle: "italic" }}>
                    Ingen ret valgt
                  </span>
                )}

                {/* Per-day actions */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 4 }}>
                  {/* Refresh this slot */}
                  <button
                    type="button"
                    onClick={() => {
                      if (recipe) {
                        refreshSlot(i);
                      } else {
                        const usedIds = new Set(editPlan.filter(Boolean).map((r) => r!.id));
                        const pick = pickOneRecipe(allRecipes, usedIds);
                        if (pick) {
                          setEditPlan((prev) => prev.map((r, j) => (j === i ? pick : r)));
                        }
                      }
                    }}
                    title={recipe ? "Forslag til ny ret" : "Tilføj ret"}
                    style={slotBtnStyle}
                  >
                    🔄
                  </button>

                  {/* Pick manually */}
                  <button
                    type="button"
                    onClick={() => setPickerForSlot(i)}
                    title="Vælg manuelt"
                    style={slotBtnStyle}
                  >
                    📌
                  </button>

                  {/* Remove */}
                  {recipe && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      title="Fjern dag"
                      style={{ ...slotBtnStyle, color: "#c0392b" }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add day button — if fewer than 7 days and all slots filled */}
          {editPlan.length < 7 && !editPlan.includes(null) && (
            <button
              type="button"
              onClick={addSlot}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                background: "transparent",
                border: "1.5px dashed var(--c-border)",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                color: "var(--c-text-muted)",
                fontWeight: 600,
              }}
            >
              ＋ Tilføj dag
            </button>
          )}
        </div>

        {/* Summary count */}
        <div
          style={{
            fontSize: 13,
            color: "var(--c-text-muted)",
            marginBottom: 18,
            textAlign: "center",
          }}
        >
          {plannedCount} / {Math.max(editPlan.length, plan.length)} retter valgt
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            disabled={loading || plannedCount === 0}
            onClick={() => onApprove(editPlan)}
            style={{
              background: loading || plannedCount === 0 ? "var(--c-border)" : "#4caf82",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "13px 0",
              fontWeight: 800,
              fontSize: 15,
              cursor: loading || plannedCount === 0 ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {loading ? "Gemmer…" : `✅ Godkend ${plannedCount > 0 ? `${plannedCount} retter` : "uge"}`}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onRegenerate}
            style={{
              background: "var(--c-input-bg)",
              color: "var(--c-text-mid)",
              border: "1.5px solid var(--c-border)",
              borderRadius: 12,
              padding: "11px 0",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            🔄 Generer ny uge
          </button>
        </div>
      </div>

      {/* Per-slot recipe picker */}
      {pickerForSlot !== null && (
        <RecipePicker
          recipes={allRecipes}
          title={`Vælg ret til ${DAGE[pickerForSlot]}`}
          onSelect={(recipe) => pickForSlot(recipe, pickerForSlot)}
          onClose={() => setPickerForSlot(null)}
        />
      )}
    </>
  );
}

const slotBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  borderRadius: 6,
  padding: "3px 5px",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  color: "var(--c-text-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
