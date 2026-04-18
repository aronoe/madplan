"use client";

import { useState } from "react";
import {
  addRecipeStep,
  deleteRecipeStep,
  updateRecipeStep,
} from "@/lib/queries";
import type { RecipeStep } from "@/lib/types";
import { Check, X, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const iconBtnClass = cn(
  "flex items-center justify-center w-6 h-6 rounded",
  "text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text) transition-colors shrink-0",
);

interface Props {
  recipeId: string;
  /** Data already loaded by the parent — no fetch on mount. */
  initialSteps: RecipeStep[];
  onStepsChange?: (steps: RecipeStep[]) => void;
}

export default function RecipeStepEditor({ recipeId, initialSteps, onStepsChange }: Props) {
  const [steps, setSteps] = useState<RecipeStep[]>(initialSteps);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addText, setAddText] = useState("");
  const [adding, setAdding] = useState(false);

  function sync(updated: RecipeStep[]) {
    setSteps(updated);
    onStepsChange?.(updated);
  }

  async function doAdd() {
    const desc = addText.trim();
    if (!desc || adding) return;
    setAdding(true);
    try {
      const nextNumber = (steps?.length ?? 0) + 1;
      const newStep = await addRecipeStep(recipeId, desc, nextNumber);
      sync([...(steps ?? []), newStep]);
      setAddText("");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(step: RecipeStep) {
    setEditId(step.id);
    setEditText(step.description);
  }

  async function handleSaveEdit(id: string) {
    const desc = editText.trim();
    if (!desc) return;
    await updateRecipeStep(id, { description: desc });
    sync((steps ?? []).map((s) => (s.id === id ? { ...s, description: desc } : s)));
    setEditId(null);
  }

  async function handleDelete(id: string) {
    const remaining = (steps ?? []).filter((s) => s.id !== id);
    const renumbered = remaining.map((s, i) => ({ ...s, step_number: i + 1 }));
    sync(renumbered);
    await deleteRecipeStep(id);
    // Keep step_number sequence tidy in DB after deletion.
    await Promise.all(renumbered.map((s) => updateRecipeStep(s.id, { step_number: s.step_number })));
  }

  const list = steps;

  return (
    <div className="border-t border-(--color-border) mt-2.5 pt-1">
      {/* Step list */}
      {list.length === 0 ? (
        <div className="text-(--color-text-muted) text-xs py-2.5">
          Ingen trin endnu.
        </div>
      ) : (
        <div className="flex flex-col mb-1">
          {list.map((step) =>
            editId === step.id ? (
              <div key={step.id} className="flex gap-2 items-start py-2 border-b border-(--color-border)/50">
                <span className="text-xs font-bold text-(--color-primary) w-5 shrink-0 mt-1.5 text-center">
                  {step.step_number}
                </span>
                <textarea
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  value={editText}
                  rows={2}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSaveEdit(step.id);
                    }
                  }}
                  className="flex-1 text-sm rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) px-2 py-1 focus:outline-none focus:border-(--color-border-focus) resize-none"
                />
                <button type="button" onClick={() => handleSaveEdit(step.id)} className={iconBtnClass} title="Gem" aria-label="Gem">
                  <Check size={12} />
                </button>
                <button type="button" onClick={() => setEditId(null)} className={iconBtnClass} title="Annuller" aria-label="Annuller">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div key={step.id} className="flex items-start gap-2 py-2.5 border-b border-(--color-border)/50">
                <span className="text-xs font-bold text-(--color-primary) w-5 shrink-0 mt-0.5 text-center">
                  {step.step_number}
                </span>
                <p className="flex-1 text-sm text-(--color-text) m-0 leading-snug">
                  {step.description}
                </p>
                <button type="button" onClick={() => startEdit(step)} className={iconBtnClass} title="Rediger" aria-label="Rediger">
                  <Pencil size={12} />
                </button>
                <button type="button" onClick={() => handleDelete(step.id)} className={iconBtnClass} title="Slet" aria-label="Slet">
                  <X size={12} />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Add row */}
      <div className="flex gap-2 items-start pt-2.5">
        <span className="text-xs font-bold text-(--color-text-muted) w-5 shrink-0 mt-1.5 text-center">
          {list.length + 1}
        </span>
        <textarea
          value={addText}
          rows={2}
          onChange={(e) => setAddText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void doAdd();
            }
          }}
          placeholder="Beskriv dette trin…"
          className="flex-1 text-sm rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) placeholder:text-(--color-text-muted) px-2 py-1 focus:outline-none focus:border-(--color-border-focus) resize-none"
        />
        <button
          type="button"
          disabled={adding || !addText.trim()}
          onClick={() => void doAdd()}
          className="inline-flex items-center gap-1 shrink-0 rounded-lg px-3 py-1 text-sm font-semibold bg-(--color-primary) text-white cursor-pointer hover:bg-(--color-primary-hover) transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-0.5"
        >
          <Plus size={13} />
          {adding ? "…" : "Tilføj"}
        </button>
      </div>
    </div>
  );
}
