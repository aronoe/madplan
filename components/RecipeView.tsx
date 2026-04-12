"use client";

import { useEffect, useState } from "react";
import { getIngredientsForRecipe, getRecipeSteps } from "@/lib/queries";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";
import RecipeImage from "@/components/ui/RecipeImage";
import RecipeIngredientEditor from "@/components/opskrifter/RecipeIngredientEditor";
import { cn } from "@/lib/cn";
import {
  Clock,
  UtensilsCrossed,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  CheckCircle,
} from "lucide-react";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onDelete: (id: string) => void;
};

export default function RecipeView({ recipe, onClose, onDelete }: Props) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCurrentStep(0);
    setEditing(false);
    setConfirmDelete(false);
    Promise.all([getIngredientsForRecipe(recipe.id), getRecipeSteps(recipe.id)])
      .then(([ings, stps]) => {
        setIngredients(ings);
        setSteps(stps);
      })
      .finally(() => setLoading(false));
  }, [recipe.id]);

  function handleDelete() {
    onDelete(recipe.id);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:max-w-lg bg-(--color-surface) rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-x-hidden overflow-y-auto max-h-[90vh] z-200 flex flex-col">

        {/* Hero image — only when available */}
        {recipe.image_url && (
          <RecipeImage
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full aspect-video shrink-0 rounded-none"
          />
        )}

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex justify-between items-start gap-3 border-b border-(--color-border)">
          <div className="flex items-start gap-3 min-w-0">
            {!recipe.image_url && (
              <span className="text-4xl leading-none shrink-0 mt-0.5">{recipe.emoji}</span>
            )}
            <div className="min-w-0">
              <h2 className="m-0 text-xl font-semibold text-(--color-text) leading-snug">
                {recipe.name}
              </h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-sm text-(--color-text-muted)">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {recipe.time_minutes} min
                </span>
                {recipe.servings && (
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed size={13} /> {recipe.servings} pers.
                  </span>
                )}
                {recipe.category && (
                  <span className="flex items-center gap-1">
                    <FolderOpen size={13} /> {recipe.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { setEditing((v) => !v); setConfirmDelete(false); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors",
                editing
                  ? "bg-(--color-primary) text-white hover:bg-(--color-primary-hover)"
                  : "bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)",
              )}
            >
              <Pencil size={13} />
              {editing ? "Færdig" : "Rediger"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-(--color-text-muted) hover:text-(--color-text) transition-colors cursor-pointer rounded-lg hover:bg-(--color-surface-2)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-(--color-text-muted) text-sm">
            Henter opskrift…
          </div>
        ) : (
          <div className="px-6 pt-5 pb-6 flex flex-col gap-6">

            {/* Ingredients */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mb-3">
                Ingredienser
              </h3>
              {ingredients.length === 0 && !editing ? (
                <p className="text-sm text-(--color-text-muted) italic">
                  Ingen ingredienser tilføjet endnu.
                </p>
              ) : (
                <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                  {ingredients.map((ing) => (
                    <li
                      key={ing.id}
                      className="flex justify-between text-sm py-1.5 border-b border-(--color-border)"
                    >
                      <span className="text-(--color-text)">{ing.name}</span>
                      <span className="text-(--color-text-muted)">
                        {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Inline ingredient editor when editing */}
              {editing && <RecipeIngredientEditor recipeId={recipe.id} />}
            </section>

            {/* Steps */}
            {steps.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mb-3">
                  Fremgangsmåde — trin {currentStep + 1} / {steps.length}
                </h3>

                <div className="bg-(--color-surface-2) border border-(--color-border) rounded-xl px-5 py-4 mb-3.5">
                  <div className="text-xs font-semibold text-(--color-primary) mb-2">
                    Trin {steps[currentStep].step_number}
                  </div>
                  <p className="m-0 text-[15px] text-(--color-text) leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </div>

                <div className="flex gap-2.5 items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                    className={cn(stepBtnClass, currentStep === 0 && "opacity-35")}
                  >
                    ← Forrige
                  </button>

                  <div className="flex-1 flex justify-center gap-1.5">
                    {steps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentStep(i)}
                        className={cn(
                          "w-2 h-2 rounded-full border-none cursor-pointer p-0 transition-colors",
                          i === currentStep ? "bg-(--color-primary)" : "bg-(--color-border)",
                        )}
                      />
                    ))}
                  </div>

                  {currentStep < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((s) => s + 1)}
                      className={cn(stepBtnClass, "bg-(--color-primary) text-white border-none")}
                    >
                      Næste trin →
                    </button>
                  ) : (
                    <div className={cn(stepBtnClass, "bg-(--color-surface-2) text-(--color-primary) border border-(--color-primary) inline-flex items-center gap-1.5")}>
                      <CheckCircle size={15} /> Færdig
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Delete — only shown when editing */}
            {editing && (
              <section className="pt-2 border-t border-(--color-border)">
                {confirmDelete ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-(--color-text-muted) m-0 flex-1">
                      Er du sikker? Dette kan ikke fortrydes.
                    </p>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 bg-(--color-danger) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} /> Ja, slet
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-sm text-(--color-text-muted) hover:text-(--color-text) cursor-pointer transition-colors px-2 py-2"
                    >
                      Annuller
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 text-(--color-danger) hover:bg-(--color-danger-subtle) rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} /> Slet opskrift
                  </button>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const stepBtnClass =
  "bg-(--color-bg) border border-(--color-border) rounded-lg px-3.5 py-2 text-sm font-medium cursor-pointer text-(--color-text-muted) whitespace-nowrap transition-colors";
