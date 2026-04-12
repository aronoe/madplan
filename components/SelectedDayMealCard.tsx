"use client";

import { useEffect, useState } from "react";
import { getIngredientsForRecipe } from "@/lib/queries";
import type { Recipe, RecipeIngredient } from "@/lib/types";
import { cn } from "@/lib/cn";
import { PackageOpen, UtensilsCrossed, FolderOpen, BookOpen, RefreshCw, Trash2 } from "lucide-react";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

type Props = {
  dayIndex: number;
  // Lightweight meal from WeekMeals (always available when a meal is set)
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
  // Full recipe from the recipes array — may include servings, category, notes
  fullRecipe: Recipe | null;
  onClear: () => void;
  onSwitch: () => void;
  onViewRecipe: () => void;
};

export default function SelectedDayMealCard({
  dayIndex,
  meal,
  fullRecipe,
  onClear,
  onSwitch,
  onViewRecipe,
}: Props) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loadingIng, setLoadingIng] = useState(false);

  // Fetch ingredients whenever the selected recipe changes
  useEffect(() => {
    if (!meal) { setIngredients([]); return; }
    setLoadingIng(true);
    getIngredientsForRecipe(meal.id)
      .then(setIngredients)
      .catch(() => setIngredients([]))
      .finally(() => setLoadingIng(false));
  }, [meal?.id]);

  const recipe = fullRecipe ?? meal;

  return (
    <div className="bg-white border border-(--color-primary-subtle) rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,80,40,.08)]">
      {/* Day label strip */}
      <div className="bg-(--color-primary) px-5 py-2.5 flex items-center justify-between">
        <span className="text-[13px] font-bold text-white uppercase tracking-wide">
          {DAGE[dayIndex]}
        </span>
        {meal && (
          <span className="text-xs text-white/70">
            {meal.time_minutes} min
          </span>
        )}
      </div>

      {meal && recipe ? (
        <div className="px-6 py-5">
          {/* Recipe title row */}
          <div className="flex items-start gap-3.5 mb-4">
            <span className="text-[44px] leading-none shrink-0">{recipe.emoji}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-(--color-primary-text) m-0 mb-1.5 leading-tight">
                {recipe.name}
              </h2>
              {/* Meta tags */}
              <div className="flex flex-wrap gap-2">
                {fullRecipe?.servings && (
                  <MetaChip icon={<UtensilsCrossed size={12} />} label={`${fullRecipe.servings} pers.`} />
                )}
                {fullRecipe?.category && (
                  <MetaChip icon={<FolderOpen size={12} />} label={fullRecipe.category} />
                )}
                {(fullRecipe?.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-(--color-active-bg) text-(--color-primary-text) border border-(--color-primary-subtle) rounded-md px-2 py-0.5 font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-(--color-primary-hover) mb-2.5">
              Ingredienser
            </div>

            {loadingIng ? (
              <div className="text-[13px] text-(--color-border) italic">Henter…</div>
            ) : ingredients.length === 0 ? (
              <div className="text-[13px] text-(--color-border) italic">
                Ingen ingredienser tilføjet endnu.
              </div>
            ) : (
              <div className="grid gap-x-4 gap-y-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="flex justify-between items-center py-1.5 border-b border-(--color-active-bg) text-[13px]"
                  >
                    <span className="text-(--color-text) font-medium">{ing.name}</span>
                    <span className="text-(--color-primary-hover) font-semibold whitespace-nowrap ml-2">
                      {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button onClick={onViewRecipe} className={cn(actionBtnClass, "bg-(--color-primary) text-white border-none")}>
              <BookOpen size={14} /> Se opskrift
            </button>
            <button onClick={onSwitch} className={cn(actionBtnClass, "bg-white text-(--color-primary-text) border border-(--color-primary-subtle)")}>
              <RefreshCw size={14} /> Skift ret
            </button>
            <button
              onClick={onClear}
              className={cn(actionBtnClass, "bg-white text-(--color-danger) border border-(--color-primary-subtle) ml-auto")}
            >
              <Trash2 size={14} /> Fjern
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="px-6 py-8 flex flex-col items-center gap-3">
          <PackageOpen size={36} className="text-(--color-primary-hover)" />
          <div className="text-[15px] text-(--color-primary-hover) font-semibold">
            Ingen ret planlagt denne dag
          </div>
          <button onClick={onSwitch} className={cn(actionBtnClass, "bg-(--color-primary) text-white border-none")}>
            <span className="text-base leading-none">＋</span> Tilføj ret
          </button>
        </div>
      )}
    </div>
  );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-(--color-surface-2) text-(--color-text-muted)">
      {icon} {label}
    </span>
  );
}

const actionBtnClass =
  "inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 font-bold text-[13px] cursor-pointer whitespace-nowrap";
