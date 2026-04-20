"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIngredientsForRecipe, getRecipeSteps, getShoppingChecked } from "@/lib/queries";
import RecipeImage from "@/components/RecipeImage";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  PackageOpen,
  UtensilsCrossed,
  FolderOpen,
  BookOpen,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ListChecks,
  ShoppingCart,
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
  upcomingDays?: Array<{ dayAbbr: string; recipeName: string }>;
};

export default function SelectedDayMealCard({
  familyId,
  dayIndex,
  weekStart,
  meal,
  fullRecipe,
  onClear,
  onSwitch,
  upcomingDays = [],
}: Props) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loadingIng, setLoadingIng] = useState(false);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [doneStepIds, setDoneStepIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showRecipe, setShowRecipe] = useState(false);

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
      setShowRecipe(false);
      return;
    }
    setLoadingIng(true);
    setLoadingSteps(true);
    setDoneStepIds(new Set());
    setShowRecipe(false);
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

  const recipe = fullRecipe ?? meal;
  const missingItems = !loadingIng ? ingredients.filter(isMissing) : [];
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

      {/* Hero image */}
      <RecipeImage
        imageUrl={fullRecipe?.image_url}
        name={recipe.name}
        className="h-40 sm:h-48"
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">

        {/* Eyebrow */}
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
        <h2 className="text-xl font-bold text-(--color-text) leading-snug m-0 mb-1">
          {recipe.name}
        </h2>

        {/* Cooktime estimate */}
        {meal.time_minutes > 0 && (
          <p className="text-sm text-(--color-text-muted) m-0 mb-3">
            Klar om ca. {meal.time_minutes} min
          </p>
        )}

        {/* Action bar: shopping status (left) + upcoming days (right) */}
        {((missingItems.length > 0 && !loadingIng) || upcomingDays.length > 0) && (
          <div className="flex items-center gap-3 py-2 mb-1 border-t border-gray-100 min-w-0">
            {missingItems.length > 0 && !loadingIng && (
              <Link
                href="/shopping-list"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 shrink-0"
              >
                <ShoppingCart size={13} />
                {missingItems.length} varer mangler til i dag
              </Link>
            )}
            {upcomingDays.length > 0 && (
              <span className="text-sm text-gray-400 truncate ml-auto min-w-0">
                {upcomingDays
                  .map((d) => `${d.dayAbbr}: ${d.recipeName.length > 25 ? d.recipeName.slice(0, 25) + "…" : d.recipeName}`)
                  .join(" · ")}
              </span>
            )}
          </div>
        )}

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

        {/* CTA row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowRecipe((v) => !v)}
            className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover)"
          >
            {showRecipe ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showRecipe ? "Skjul opskrift" : "Se opskrift"}
          </button>

          {missingItems.length > 0 && (
            <Link
              href={`/shopping-list?recipeId=${recipe.id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border transition-colors bg-(--color-surface-2) text-(--color-text) border-(--color-text-muted)/50 hover:border-(--color-text-muted)/80 hover:bg-(--color-bg)"
            >
              <ListChecks size={14} />
              {missingItems.length} varer på indkøbslisten
            </Link>
          )}
        </div>

        {/* Inline missing preview */}
        {missingItems.length > 0 && !loadingIng && (
          <p className="text-xs text-(--color-text-muted) mt-2 m-0">
            {missingItems.slice(0, 3).map((i) => i.name).join(" · ")}
            {missingItems.length > 3 && (
              <span className="opacity-60"> · +{missingItems.length - 3}</span>
            )}
          </p>
        )}

      </div>

      {/* ── Recipe expand: ingredients + steps ────────────────────────────── */}
      {showRecipe && (
        <>
          <div className="h-px bg-(--color-border) mx-5" />

          <div className="grid grid-cols-1 sm:grid-cols-2">

            {/* Left: Ingredients */}
            <div className="px-5 pt-5 pb-5 sm:border-r border-(--color-border)">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) m-0 mb-3">
                Ingredienser
              </h3>

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
                        className="flex justify-between items-center text-sm py-2 border-b border-(--color-border)/40 last:border-0"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "w-1.5 h-1.5 shrink-0 rounded-full",
                            missing ? "bg-(--color-danger) opacity-60" : "bg-(--color-primary) opacity-25",
                          )} />
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
              <div className="flex items-center justify-between mb-3">
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
