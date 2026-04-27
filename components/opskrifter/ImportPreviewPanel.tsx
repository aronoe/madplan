"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { ParsedIngredient } from "@/lib/ingredient-parser";
import { cn } from "@/lib/cn";

interface Props {
  imageUrl: string | null;
  ingredients: ParsedIngredient[];
  steps: string[];
  onChange(rows: ParsedIngredient[]): void;
}

function isBlocking(row: ParsedIngredient): boolean {
  return row.amount !== "" && !isFinite(parseFloat(row.amount.replace(",", ".")));
}

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
  const [showSteps, setShowSteps] = useState(false);

  const total = ingredients.length;
  const readyCount = ingredients.filter((r) => r.confidence === "high" && !isBlocking(r)).length;
  const blockingCount = ingredients.filter(isBlocking).length;
  const pct = total === 0 ? 100 : Math.round((readyCount / total) * 100);

  function updateRow(index: number, patch: Partial<ParsedIngredient>) {
    onChange(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Opskriftsbillede"
          className="w-full h-48 object-cover rounded-xl"
        />
      )}

      {/* Ingredients section */}
      {ingredients.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Section header */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-(--color-text)">
              Ingredienser
            </h3>
            <span className="text-xs text-(--color-text-muted)">
              {readyCount === total
                ? "Alle klar"
                : `${readyCount} / ${total} klar`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-(--color-border) overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                readyCount === total ? "bg-(--color-primary)" : "bg-(--color-warning)",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Blocking error — must fix before saving */}
          {blockingCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm border bg-(--color-danger-subtle) border-(--color-danger) text-(--color-danger)">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                {blockingCount === 1
                  ? "1 ingrediens skal rettes før du kan gemme"
                  : `${blockingCount} ingredienser skal rettes før du kan gemme`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-[72px_72px_1fr] gap-1.5 px-1">
            {["Mængde", "Enhed", "Ingrediens"].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-(--color-text-muted)">
                {h}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            {ingredients.map((row, i) => {
              const blocking = isBlocking(row);
              const warn = !blocking && row.confidence !== "high";
              const hint = rowHint(row);
              return (
                <div key={i} className="flex flex-col gap-0.5">
                  <div
                    className={cn(
                      "grid grid-cols-[72px_72px_1fr] gap-1.5 rounded-lg px-1 py-0.5 border",
                      blocking
                        ? "bg-(--color-danger-subtle) border-(--color-danger)"
                        : warn
                        ? "bg-(--color-warning-subtle) border-(--color-warning-border)"
                        : "border-transparent",
                    )}
                  >
                    <input type="text" value={row.amount} onChange={(e) => updateRow(i, { amount: e.target.value })} placeholder="—" className={inputClass} aria-label="Mængde" />
                    <input type="text" value={row.unit} onChange={(e) => updateRow(i, { unit: e.target.value })} placeholder="—" className={inputClass} aria-label="Enhed" />
                    <input type="text" value={row.name} onChange={(e) => updateRow(i, { name: e.target.value })} placeholder="Ingrediens" required className={inputClass} aria-label="Ingrediens" />
                  </div>
                  {hint && <p className="text-[11px] text-(--color-warning-text) pl-1.5">{hint}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps — collapsed by default */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--color-text-muted) hover:text-(--color-text) transition-colors cursor-pointer self-start"
          >
            {showSteps ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Fremgangsmåde ({steps.length} trin)
          </button>

          {showSteps && (
            <ol className="list-none p-0 m-0 flex flex-col gap-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-bold text-(--color-text-muted) text-xs w-4 pt-0.5">
                    {i + 1}.
                  </span>
                  <span className="text-(--color-text) leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
