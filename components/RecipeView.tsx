"use client";

import { useEffect, useState } from "react";
import { getIngredientsForRecipe, getRecipeSteps } from "@/lib/queries";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Clock, UtensilsCrossed, FolderOpen, Pencil, X, CheckCircle } from "lucide-react";
import RecipeImage from "@/components/ui/RecipeImage";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
};

export default function RecipeView({ recipe, onClose, onEdit }: Props) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setCurrentStep(0);
    Promise.all([getIngredientsForRecipe(recipe.id), getRecipeSteps(recipe.id)])
      .then(([ings, stps]) => {
        setIngredients(ings);
        setSteps(stps);
      })
      .finally(() => setLoading(false));
  }, [recipe.id]);

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
        <div className="px-6 pt-6 pb-0 flex justify-between items-start gap-3">
          <div>
            {!recipe.image_url && (
              <div className="text-[40px] mb-1.5">{recipe.emoji}</div>
            )}
            <h2 className="m-0 text-[22px] font-extrabold text-(--color-text)">
              {recipe.name}
            </h2>
            <div className="flex gap-4 mt-1.5">
              <span className="text-[13px] text-(--color-text-muted) flex items-center gap-1">
                <Clock size={14} /> {recipe.time_minutes} min
              </span>
              {recipe.servings && (
                <span className="text-[13px] text-(--color-text-muted) flex items-center gap-1">
                  <UtensilsCrossed size={14} /> {recipe.servings} pers.
                </span>
              )}
              {recipe.category && (
                <span className="text-[13px] text-(--color-text-muted) flex items-center gap-1">
                  <FolderOpen size={14} /> {recipe.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="bg-(--color-bg) border border-(--color-border) rounded-lg px-3.5 py-1.5 text-[13px] font-bold cursor-pointer text-(--color-text-mid) inline-flex items-center gap-1.5"
            >
              <Pencil size={14} /> Rediger
            </button>
            <button
              onClick={onClose}
              className="bg-transparent border-none cursor-pointer text-(--color-text-muted) leading-none p-1 flex items-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-(--color-text-muted)">
            Henter opskrift…
          </div>
        ) : (
          <div className="px-6 pt-5 pb-7 flex flex-col gap-6">

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <section>
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-muted) mb-2.5">
                  Ingredienser
                </h3>
                <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                  {ingredients.map((ing) => (
                    <li
                      key={ing.id}
                      className="flex justify-between text-sm text-(--color-text) py-1.5 border-b border-(--color-border)"
                    >
                      <span>{ing.name}</span>
                      <span className="text-(--color-text-muted) font-semibold">
                        {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Steps */}
            {steps.length > 0 && (
              <section>
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-muted) mb-2.5">
                  Fremgangsmåde — trin {currentStep + 1} / {steps.length}
                </h3>

                {/* Step card */}
                <div className="bg-(--color-active-bg) border border-(--color-border) rounded-xl px-5 py-4 mb-3.5">
                  <div className="text-xs font-bold text-(--color-primary) mb-2">
                    Trin {steps[currentStep].step_number}
                  </div>
                  <p className="m-0 text-[15px] text-(--color-text) leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </div>

                {/* Step navigation */}
                <div className="flex gap-2.5 items-center">
                  <button
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={currentStep === 0}
                    className={cn(stepNavBtnClass, currentStep === 0 ? "opacity-35" : "opacity-100")}
                  >
                    ← Forrige
                  </button>

                  {/* Step dots */}
                  <div className="flex-1 flex justify-center gap-1.5">
                    {steps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={cn(
                          "w-2 h-2 rounded-full border-none cursor-pointer p-0",
                          i === currentStep ? "bg-(--color-primary)" : "bg-(--color-border)",
                        )}
                      />
                    ))}
                  </div>

                  {currentStep < steps.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep((s) => s + 1)}
                      className={cn(stepNavBtnClass, "bg-(--color-primary) text-white border-none")}
                    >
                      Næste trin →
                    </button>
                  ) : (
                    <div className={cn(stepNavBtnClass, "bg-(--color-active-bg) text-(--color-primary-text) border border-(--color-primary) text-center inline-flex items-center gap-1.5")}>
                      <CheckCircle size={16} /> Færdig
                    </div>
                  )}
                </div>
              </section>
            )}

            {ingredients.length === 0 && steps.length === 0 && (
              <p className="text-(--color-text-muted) text-sm text-center">
                Ingen ingredienser eller trin endnu.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const stepNavBtnClass =
  "bg-(--color-bg) border border-(--color-border) rounded-lg px-3.5 py-2 text-[13px] font-bold cursor-pointer text-(--color-text-mid) whitespace-nowrap";
