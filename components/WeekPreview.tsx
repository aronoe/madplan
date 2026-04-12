"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/types";
import type { Tempo } from "@/lib/autoSelect";
import { pickOneRecipe } from "@/lib/autoSelect";
import RecipePicker from "@/components/RecipePicker";
import { cn } from "@/lib/cn";
import { UtensilsCrossed, RefreshCw, Pin, CheckCircle, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

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
      <div className="bg-(--color-surface) rounded-2xl shadow-sm border border-(--color-border) p-6 w-full max-w-lg">
        {/* Header */}
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-(--color-text) m-0 mb-1">
            <UtensilsCrossed size={20} />
            Din ugeplan
          </h2>
          <p className="text-sm text-(--color-text-mid) m-0">{summary}</p>
        </div>

        {/* Soft warning if fewer recipes than days requested */}
        {warning && (
          <div className="bg-(--color-warning-subtle) border border-(--color-warning-border) rounded-xl p-3 text-xs text-(--color-text-mid) mb-4">
            ⚠️ {warning}
          </div>
        )}

        {/* Day rows — editable */}
        <div className="flex flex-col gap-1.5 mb-5">
          {Array.from({ length: Math.max(editPlan.length, 1) }, (_, i) => {
            const recipe = editPlan[i] ?? null;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border min-h-12 transition-colors",
                  recipe
                    ? "bg-(--color-active-bg) border-(--color-border)"
                    : "bg-(--color-bg) border-dashed border-(--color-border) opacity-60"
                )}
              >
                {/* Day label */}
                <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-text-muted) min-w-12.5">
                  {DAGE[i]}
                </span>

                {recipe ? (
                  <>
                    <span className="text-lg shrink-0">{recipe.emoji}</span>
                    <span className="flex-1 text-[13px] font-semibold text-(--color-text) overflow-hidden text-ellipsis whitespace-nowrap">
                      {recipe.name}
                    </span>
                    <span className="text-[11px] text-(--color-text-muted) shrink-0">
                      {recipe.time_minutes} min
                    </span>
                  </>
                ) : (
                  <span className="flex-1 text-[13px] text-(--color-text-muted) italic">
                    Ingen ret valgt
                  </span>
                )}

                {/* Per-day actions */}
                <div className="flex gap-1 shrink-0 ml-1">
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
                    className="flex items-center justify-center w-7 h-7 rounded-md text-(--color-text-muted) hover:bg-(--color-surface-2) transition-colors"
                  >
                    <RefreshCw size={14} />
                  </button>

                  {/* Pick manually */}
                  <button
                    type="button"
                    onClick={() => setPickerForSlot(i)}
                    title="Vælg manuelt"
                    className="flex items-center justify-center w-7 h-7 rounded-md text-(--color-text-muted) hover:bg-(--color-surface-2) transition-colors"
                  >
                    <Pin size={14} />
                  </button>

                  {/* Remove */}
                  {recipe && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      title="Fjern dag"
                      className="flex items-center justify-center w-7 h-7 rounded-md text-(--color-danger) hover:bg-(--color-danger-subtle) transition-colors"
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
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border border-dashed border-(--color-border) rounded-xl cursor-pointer text-[13px] text-(--color-text-muted) font-semibold hover:border-(--color-primary) hover:text-(--color-primary) transition-colors"
            >
              <Plus size={14} />
              Tilføj dag
            </button>
          )}
        </div>

        {/* Summary count */}
        <div className="text-[13px] text-(--color-text-muted) mb-4 text-center">
          {plannedCount} / {Math.max(editPlan.length, plan.length)} retter valgt
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading || plannedCount === 0}
            onClick={() => onApprove(editPlan)}
          >
            <CheckCircle size={16} />
            {loading ? "Gemmer…" : `Godkend ${plannedCount > 0 ? `${plannedCount} retter` : "uge"}`}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            disabled={loading}
            onClick={onRegenerate}
          >
            <RefreshCw size={14} />
            Generer ny uge
          </Button>
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
