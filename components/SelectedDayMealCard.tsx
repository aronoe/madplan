"use client";

import { useEffect, useState } from "react";
import { getIngredientsForRecipe } from "@/lib/queries";
import type { Recipe, RecipeIngredient } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  PackageOpen,
  UtensilsCrossed,
  FolderOpen,
  BookOpen,
  RefreshCw,
  Trash2,
  Plus,
  Clock,
} from "lucide-react";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

function formatAmount(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

type Props = {
  dayIndex: number;
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
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
    <div className="bg-(--color-bg) border border-(--color-border) rounded-xl shadow-sm">

      {meal && recipe ? (
        <div className="p-5">

          {/* Day + time eyebrow */}
          <div className="flex items-center gap-2 text-xs text-(--color-text-muted) mb-3">
            <span className="font-medium">{DAGE[dayIndex]}</span>
            <span>·</span>
            <Clock size={11} />
            <span>{meal.time_minutes} min</span>
          </div>

          {/* Recipe identity */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl leading-none shrink-0">{recipe.emoji}</span>
            <h2 className="text-lg font-semibold text-(--color-text) leading-snug m-0">
              {recipe.name}
            </h2>
          </div>

          {/* Secondary meta — servings + category as plain text */}
          {(fullRecipe?.servings || fullRecipe?.category) && (
            <div className="flex items-center gap-2 text-sm text-(--color-text-muted) mb-3">
              {fullRecipe.servings && (
                <span className="flex items-center gap-1">
                  <UtensilsCrossed size={12} /> {fullRecipe.servings} pers.
                </span>
              )}
              {fullRecipe.servings && fullRecipe.category && <span>·</span>}
              {fullRecipe.category && (
                <span className="flex items-center gap-1">
                  <FolderOpen size={12} /> {fullRecipe.category}
                </span>
              )}
            </div>
          )}

          {/* Tags — quiet, neutral */}
          {(fullRecipe?.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {(fullRecipe?.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-(--color-surface-2) text-(--color-text-muted) rounded px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients — flowing list, no borders */}
          {(loadingIng || ingredients.length > 0) && (
            <div className="mb-5">
              <div className="text-xs text-(--color-text-muted) mb-2">
                Ingredienser
              </div>
              {loadingIng ? (
                <p className="text-sm text-(--color-text-muted) italic m-0">Henter…</p>
              ) : (
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {ingredients.map((ing) => (
                    <span key={ing.id} className="text-sm text-(--color-text)">
                      {ing.name}
                      <span className="text-(--color-text-muted) ml-1">
                        {formatAmount(ing.amount)} {ing.unit}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions — clear weight hierarchy */}
          <div className="flex items-center gap-1.5 pt-4 border-t border-(--color-border)">
            {/* Primary */}
            <button
              onClick={onViewRecipe}
              className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover)"
            >
              <BookOpen size={14} /> Se opskrift
            </button>
            {/* Secondary — ghost */}
            <button
              onClick={onSwitch}
              className="inline-flex items-center gap-1.5 text-(--color-text-muted) hover:text-(--color-text) rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
            >
              <RefreshCw size={14} /> Skift ret
            </button>
            <div className="flex-1" />
            {/* Destructive — ghost, right-aligned */}
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-(--color-danger) hover:bg-(--color-danger-subtle) rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
            >
              <Trash2 size={14} /> Fjern
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="p-8 flex flex-col items-center gap-3">
          <PackageOpen size={28} className="text-(--color-text-muted)" strokeWidth={1.5} />
          <p className="text-sm text-(--color-text-muted) m-0">
            {DAGE[dayIndex]} — ingen ret planlagt
          </p>
          <button
            onClick={onSwitch}
            className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover)"
          >
            <Plus size={14} /> Tilføj ret
          </button>
        </div>
      )}
    </div>
  );
}
