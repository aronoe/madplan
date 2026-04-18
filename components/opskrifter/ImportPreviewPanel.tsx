"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { ParsedIngredient } from "@/lib/ingredient-parser";

interface Props {
  imageUrl: string | null;
  ingredients: ParsedIngredient[];
  steps: string[];
  onChange(rows: ParsedIngredient[]): void;
}

// Only block save when amount is explicitly set to something that can't parse.
// Empty amount is allowed (saved as 0 — covers "salt", "peber" etc.).
function isBlocking(row: ParsedIngredient): boolean {
  return row.amount !== "" && !isFinite(parseFloat(row.amount.replace(",", ".")));
}

// Inline hint shown below a row to guide correction without blocking.
function rowHint(row: ParsedIngredient): string | null {
  if (row.confidence === "low" && row.amount === "") return "mangler mængde";
  if (row.confidence === "medium" && row.amount !== "" && row.unit === "") return "ukendt enhed";
  return null;
}

const inputClass =
  "w-full px-2 py-1.5 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary) transition-colors";

export default function ImportPreviewPanel({
  imageUrl,
  ingredients,
  steps,
  onChange,
}: Props) {
  const [showAllSteps, setShowAllSteps] = useState(false);

  const nonHighCount = ingredients.filter((r) => r.confidence !== "high").length;
  const blockingCount = ingredients.filter(isBlocking).length;
  const visibleSteps = showAllSteps ? steps : steps.slice(0, 3);

  function updateRow(index: number, patch: Partial<ParsedIngredient>) {
    onChange(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="font-semibold text-(--color-text)">Importeret opskrift</div>

      {/* Image preview */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Opskriftsbillede"
          className="w-full h-28 object-cover rounded-xl"
        />
      )}

      {/* Warning / info banner */}
      {nonHighCount > 0 && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
            blockingCount > 0
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            {blockingCount > 0
              ? `${blockingCount} ${blockingCount === 1 ? "ingrediens skal rettes" : "ingredienser skal rettes"} før du kan gemme`
              : `${nonHighCount} ${nonHighCount === 1 ? "ingrediens skal tjekkes" : "ingredienser skal tjekkes"}`}
          </span>
        </div>
      )}

      {/* Ingredients table */}
      {ingredients.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-(--color-text-muted)">
            Ingredienser ({ingredients.length})
          </span>

          {/* Column headers */}
          <div className="grid grid-cols-[72px_72px_1fr] gap-1.5 px-1">
            {["Mængde", "Enhed", "Ingrediens"].map((h) => (
              <span
                key={h}
                className="text-[10px] font-bold uppercase tracking-wide text-(--color-text-muted)"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1.5">
            {ingredients.map((row, i) => {
              const blocking = isBlocking(row);
              const warn = !blocking && row.confidence !== "high";
              const hint = rowHint(row);
              return (
                <div key={i} className="flex flex-col gap-0.5">
                  <div
                    className={`grid grid-cols-[72px_72px_1fr] gap-1.5 rounded-lg px-1 py-0.5 ${
                      blocking
                        ? "bg-red-50 border border-red-200"
                        : warn
                        ? "bg-amber-50/60 border border-amber-100"
                        : "border border-transparent"
                    }`}
                  >
                    <input
                      type="text"
                      value={row.amount}
                      onChange={(e) => updateRow(i, { amount: e.target.value })}
                      placeholder="—"
                      className={inputClass}
                      aria-label="Mængde"
                    />
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => updateRow(i, { unit: e.target.value })}
                      placeholder="—"
                      className={inputClass}
                      aria-label="Enhed"
                    />
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder="Ingrediens"
                      required
                      className={inputClass}
                      aria-label="Ingrediens"
                    />
                  </div>
                  {hint && (
                    <p className="text-[11px] text-amber-600 pl-1.5">{hint}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-(--color-text-muted)">
            Fremgangsmåde ({steps.length} trin)
          </span>
          <ol className="list-none p-0 m-0 flex flex-col gap-2">
            {visibleSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 font-bold text-(--color-text-muted) text-xs w-4 pt-0.5">
                  {i + 1}.
                </span>
                <span className="text-(--color-text) leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          {steps.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllSteps((v) => !v)}
              className="text-sm text-(--color-primary) hover:underline self-start cursor-pointer"
            >
              {showAllSteps ? "Vis færre" : `Vis alle ${steps.length} trin`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
