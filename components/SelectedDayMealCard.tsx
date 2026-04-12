"use client";

import { useEffect, useState } from "react";
import { getIngredientsForRecipe } from "@/lib/queries";
import type { Recipe, RecipeIngredient } from "@/lib/types";
import { cn } from "@/lib/cn";
import { PackageOpen, UtensilsCrossed, FolderOpen, BookOpen, RefreshCw, Trash2, Plus } from "lucide-react";

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
    <div className="bg-(--color-bg) border border-(--color-border) rounded-2xl overflow-hidden shadow-sm">
      {/* Day label strip */}
      <div className="bg-(--color-surface) border-b border-(--color-border) px-5 py-3 flex items-center justify-between">
        <span className="text-xs font-bold text-(--color-primary) uppercase tracking-widest">
          {DAGE[dayIndex]}
        </span>
        {meal && (
          <span className="text-xs text-(--color-text-muted)">
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
            <div className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mb-3">
              Ingredienser
            </div>

            {loadingIng ? (
              <div className="text-sm text-(--color-text-muted) italic">Henter…</div>
            ) : ingredients.length === 0 ? (
              <div className="text-sm text-(--color-text-muted) italic">
                Ingen ingredienser tilføjet endnu.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
                {ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="flex justify-between items-center py-1.5 border-b border-(--color-border) text-sm"
                  >
                    <span className="text-(--color-text)">{ing.name}</span>
                    <span className="text-(--color-text-muted) whitespace-nowrap ml-2">
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
            <button onClick={onSwitch} className={cn(actionBtnClass, "bg-(--color-surface) text-(--color-primary-text) border border-(--color-border)")}>
              <RefreshCw size={14} /> Skift ret
            </button>
            <button
              onClick={onClear}
              className={cn(actionBtnClass, "bg-(--color-surface) text-(--color-danger) border border-(--color-border) ml-auto")}
            >
              <Trash2 size={14} /> Fjern
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="px-6 py-10 flex flex-col items-center gap-3">
          <PackageOpen size={32} className="text-(--color-text-muted)" />
          <div className="text-sm text-(--color-text-muted)">
            Ingen ret planlagt denne dag
          </div>
          <button onClick={onSwitch} className={cn(actionBtnClass, "bg-(--color-primary) text-white border-none mt-1")}>
            <Plus size={14} /> Tilføj ret
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
  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold text-sm cursor-pointer whitespace-nowrap transition-colors";
