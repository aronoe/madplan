"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIngredientsForRecipe, getRecipeSteps, getShoppingChecked } from "@/lib/queries";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  PackageOpen,
  UtensilsCrossed,
  FolderOpen,
  BookOpen,
  ShoppingCart,
  RefreshCw,
  Trash2,
  Plus,
  Clock,
  CheckSquare,
  Square,
  X,
} from "lucide-react";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

function formatAmount(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}


type Props = {
  familyId: string;
  dayIndex: number;
  weekStart: string;
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
  fullRecipe: Recipe | null;
  onClear: () => void;
  onSwitch: () => void;
};

export default function SelectedDayMealCard({
  familyId,
  dayIndex,
  weekStart,
  meal,
  fullRecipe,
  onClear,
  onSwitch,
}: Props) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loadingIng, setLoadingIng] = useState(false);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [doneStepIds, setDoneStepIds] = useState<Set<string>>(new Set());
  // Set of recipe_ingredient_ids that are checked in the shopping list
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isCookingMode, setIsCookingMode] = useState(false);

  useEffect(() => {
    getShoppingChecked(familyId, weekStart)
      .then(setCheckedIds)
      .catch(() => setCheckedIds(new Set()));
  }, [familyId, weekStart]);

  useEffect(() => {
    if (!meal) {
      setIngredients([]);
      setSteps([]);
      setDoneStepIds(new Set());
      setIsCookingMode(false);
      return;
    }
    setLoadingIng(true);
    setLoadingSteps(true);
    setDoneStepIds(new Set());
    setIsCookingMode(false);
    getIngredientsForRecipe(meal.id)
      .then(setIngredients)
      .catch(() => setIngredients([]))
      .finally(() => setLoadingIng(false));
    getRecipeSteps(meal.id)
      .then(setSteps)
      .catch(() => setSteps([]))
      .finally(() => setLoadingSteps(false));
  }, [meal?.id]);

  function toggleDoneStep(id: string) {
    setDoneStepIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function isMissing(ing: RecipeIngredient): boolean {
    return !checkedIds.has(ing.id);
  }

  const router = useRouter();
  const recipe = fullRecipe ?? meal;
  const missingCount = ingredients.filter(isMissing).length;
  const doneCount = doneStepIds.size;

  /* ── Empty state ──────────────────────────────────────────────────────────── */
  if (!meal || !recipe) {
    return (
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-10 flex flex-col items-center gap-4">
        <PackageOpen size={32} className="text-(--color-text-muted)" strokeWidth={1.5} />
        <p className="text-sm text-(--color-text-muted) m-0">
          {DAGE[dayIndex]} — ingen ret planlagt
        </p>
        <button
          onClick={onSwitch}
          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover)"
        >
          <Plus size={14} /> Tilføj ret
        </button>
      </div>
    );
  }

  /* ── Hero card ────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden shadow-sm">

      {/* Hero image or emoji banner */}
      {fullRecipe?.image_url ? (
        <img
          src={fullRecipe.image_url}
          alt={recipe.name}
          className="w-full h-48 sm:h-56 object-cover"
        />
      ) : (
        <div className="w-full h-32 bg-(--color-surface-2) flex items-center justify-center">
          <span className="text-6xl leading-none select-none">{recipe.emoji}</span>
        </div>
      )}

      {/* ── Header: meta + actions ─────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">

        {/* Eyebrow: day + quick meta */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--color-text-muted) mb-2">
          <span className="font-semibold text-(--color-text)">{DAGE[dayIndex]}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {meal.time_minutes} min</span>
          {fullRecipe?.servings && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <UtensilsCrossed size={11} /> {fullRecipe.servings} pers.
              </span>
            </>
          )}
          {fullRecipe?.category && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <FolderOpen size={11} /> {fullRecipe.category}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-(--color-text) leading-snug m-0 mb-3">
          {recipe.name}
        </h2>

        {/* Tags */}
        {(fullRecipe?.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {(fullRecipe!.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-(--color-bg) border border-(--color-border) text-(--color-text-muted) rounded-full px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/shopping-list?recipeId=${recipe.id}`)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer border transition-colors",
              missingCount > 0
                ? "bg-(--color-danger-subtle) text-(--color-danger) border-(--color-danger)/30 hover:border-(--color-danger)/60"
                : "bg-(--color-surface-2) text-(--color-text) border-(--color-border) hover:border-(--color-text-muted)",
            )}
          >
            <ShoppingCart size={14} />
            Indkøbsliste
            {missingCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 leading-none min-w-5">
                {missingCount}
              </span>
            )}
          </button>
          {isCookingMode ? (
            <button
              type="button"
              onClick={() => setIsCookingMode(false)}
              className="inline-flex items-center gap-1.5 text-(--color-text-muted) hover:text-(--color-text) rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
            >
              <X size={14} /> Luk madlavning
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCookingMode(true)}
              className="inline-flex items-center gap-1.5 bg-(--color-surface-2) text-(--color-text) border border-(--color-border) hover:border-(--color-text-muted) rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors"
            >
              <UtensilsCrossed size={14} /> Start madlavning
            </button>
          )}
          <button
            onClick={onSwitch}
            className="inline-flex items-center gap-1.5 text-(--color-text-muted) hover:text-(--color-text) rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
          >
            <RefreshCw size={14} /> Skift ret
          </button>
          <div className="flex-1" />
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-(--color-danger) hover:bg-(--color-danger-subtle) rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Overview: compact ingredient preview (max 3) */}
        {!isCookingMode && !loadingIng && ingredients.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
            {ingredients.slice(0, 3).map((ing) => (
              <span key={ing.id} className="text-sm text-(--color-text-muted)">
                {ing.name}
                <span className="ml-1 text-xs opacity-60">
                  {formatAmount(ing.amount)} {ing.unit}
                </span>
              </span>
            ))}
            {ingredients.length > 3 && (
              <span className="text-sm text-(--color-text-muted) italic">
                + {ingredients.length - 3} mere
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Cooking mode: full ingredients + steps ────────────────────────── */}
      {isCookingMode && (
        <>
          <div className="h-px bg-(--color-border) mx-5" />

          <div className="grid grid-cols-1 sm:grid-cols-2">

            {/* Left: Ingredients */}
            <div className="px-5 pt-5 pb-5 sm:border-r border-(--color-border)">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) m-0 mb-1">
                Ingredienser
              </h3>
              <p className="text-xs text-(--color-text-muted) italic m-0 mb-3">
                Status opdateres via indkøbslisten
              </p>

              {loadingIng ? (
                <p className="text-sm text-(--color-text-muted) italic m-0">Henter…</p>
              ) : ingredients.length === 0 ? (
                <p className="text-sm text-(--color-text-muted) italic m-0">Ingen ingredienser tilføjet endnu.</p>
              ) : (
                <ul className="list-none p-0 m-0 flex flex-col">
                  {ingredients.map((ing) => {
                    const missing = isMissing(ing);
                    return (
                      <li
                        key={ing.id}
                        className="flex justify-between items-center text-sm py-2"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {missing ? (
                            <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-(--color-danger) opacity-60" />
                          ) : (
                            <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-(--color-primary) opacity-25" />
                          )}
                          <span className={cn(
                            "truncate",
                            missing ? "text-(--color-danger) opacity-75" : "text-(--color-text)",
                          )}>
                            {ing.name}
                          </span>
                        </span>
                        <span className="text-(--color-text-muted) ml-3 shrink-0 text-xs">
                          {formatAmount(ing.amount)} {ing.unit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="sm:hidden h-px bg-(--color-border) mt-5" />
            </div>

            {/* Right: Steps */}
            <div className="px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) m-0">
                  Fremgangsmåde
                </h3>
                {steps.length > 0 && doneCount > 0 && (
                  <span className="text-xs text-(--color-primary) font-medium">
                    {doneCount} / {steps.length} trin
                  </span>
                )}
              </div>

              {loadingSteps ? (
                <p className="text-sm text-(--color-text-muted) italic m-0">Henter trin…</p>
              ) : steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <BookOpen size={22} className="text-(--color-text-muted) opacity-30" strokeWidth={1.5} />
                  <p className="text-sm text-(--color-text-muted) font-medium m-0">Ingen trin endnu</p>
                  <p className="text-xs text-(--color-text-muted) opacity-50 m-0">Tilføj trin i opskriften</p>
                </div>
              ) : (
                <ol className="list-none p-0 m-0 flex flex-col gap-2">
                  {steps.map((step) => {
                    const done = doneStepIds.has(step.id);
                    return (
                      <li
                        key={step.id}
                        onClick={() => toggleDoneStep(step.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl px-3.5 py-3 border cursor-pointer transition-colors",
                          done
                            ? "bg-(--color-surface-2) border-(--color-border) opacity-50"
                            : "bg-(--color-bg) border-(--color-border) hover:border-(--color-primary)",
                        )}
                      >
                        <span className="shrink-0 mt-0.5 text-(--color-primary)">
                          {done ? <CheckSquare size={16} /> : <Square size={16} />}
                        </span>
                        <span className="flex-1 leading-relaxed text-sm">
                          <span className="font-bold text-xs text-(--color-text-muted) mr-1.5">
                            {step.step_number}.
                          </span>
                          <span className={done ? "line-through text-(--color-text-muted)" : "text-(--color-text)"}>
                            {step.description}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
