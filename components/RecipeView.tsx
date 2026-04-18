"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getIngredientsForRecipe, getRecipeSteps, updateRecipe } from "@/lib/queries";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";
import RecipeImage from "@/components/ui/RecipeImage";
import RecipeIngredientEditor from "@/components/opskrifter/RecipeIngredientEditor";
import RecipeStepEditor from "@/components/opskrifter/RecipeStepEditor";
import { cn } from "@/lib/cn";
import {
  Clock,
  UtensilsCrossed,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  ImageOff,
  TriangleAlert,
  ChevronDown,
  Heart,
  BookmarkPlus,
  BookmarkCheck,
} from "lucide-react";

// Defined at module scope so React sees a stable component identity across
// RecipeView renders — prevents unmount/remount of child editors on every render.
function EditSection({
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between -mx-1 px-1 py-1.5 rounded-lg hover:bg-(--color-surface-2) transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
            {title}
          </span>
          {badge && (
            <span className="text-xs text-(--color-text-muted) font-normal">{badge}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-(--color-text-muted) shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open && children}
    </div>
  );
}

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onDelete: (id: string) => void;
  onImageChange?: (id: string, url: string | null) => void;
  onToggleFavorite?: (id: string, value: boolean) => void;
  onToggleQueue?: (id: string, value: boolean) => void;
};

export default function RecipeView({ recipe, onClose, onDelete, onImageChange, onToggleFavorite, onToggleQueue }: Props) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageUrl, setImageUrl] = useState(recipe.image_url ?? "");
  const [imageSaving, setImageSaving] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageInputVisible, setImageInputVisible] = useState(false);
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set());
  const [openIngredients, setOpenIngredients] = useState(true);
  const [openSteps, setOpenSteps] = useState(true);

  useEffect(() => {
    setImageUrl(recipe.image_url ?? "");
    setImageError("");
  }, [recipe.id, recipe.image_url]);

  // Collapse URL input, reset stepper, and restore default accordion state
  // when edit mode toggles or the recipe changes.
  useEffect(() => {
    setImageInputVisible(false);
    setCurrentStep(0);
    if (editing) {
      setOpenIngredients(true);
      setOpenSteps(true);
    }
  }, [editing, recipe.id]);

  function isValidUrl(s: string) {
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }

  async function saveImage(value: string | null) {
    const url = value?.trim() ? value.trim() : null;
    if (url && !isValidUrl(url)) {
      setImageError("Indtast en gyldig URL (skal starte med https://)");
      return;
    }
    setImageError("");
    setImageSaving(true);
    try {
      await updateRecipe(recipe.id, { image_url: url }, recipe.family_id);
      onImageChange?.(recipe.id, url);
      // Collapse input after a successful save so the thumbnail takes over.
      if (url) setImageInputVisible(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        console.error("[saveImage] network error — could not reach /api/recipes:", err);
      } else if (msg.includes("API error 4")) {
        console.error("[saveImage] API validation error:", msg);
      } else {
        console.error("[saveImage] server/DB error:", err);
      }
      setImageError("Kunne ikke gemme billedet. Prøv igen.");
    } finally {
      setImageSaving(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setCurrentStep(0);
    setEditing(false);
    setConfirmDelete(false);
    setMissingIds(new Set());
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

      {/* Modal — fixed height shell so content changes never move or resize the frame.
           Mobile: bottom sheet pinned to viewport bottom, 90vh tall.
           Desktop: centered dialog, fixed 82vh, scrollable content inside. */}
      <div className="fixed bottom-0 left-0 right-0 h-[90vh] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:h-[82vh] sm:-translate-x-1/2 sm:-translate-y-1/2 bg-(--color-surface) rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden z-200 flex flex-col">

        {/* Hero image — always visible in edit mode so image actions are accessible */}
        {(imageUrl || recipe.image_url || editing) && (
          <div className="relative w-full h-44 sm:h-52 shrink-0 overflow-hidden">
            {imageUrl || recipe.image_url ? (
              <RecipeImage
                src={imageUrl || recipe.image_url}
                alt={recipe.name}
                className="w-full h-full object-cover rounded-none"
              />
            ) : (
              /* Placeholder when editing with no image */
              <div className="w-full h-full bg-(--color-surface-2) flex items-center justify-center">
                {!imageInputVisible && (
                  <button
                    type="button"
                    onClick={() => setImageInputVisible(true)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) transition-colors cursor-pointer"
                  >
                    <Pencil size={14} /> Tilføj billede
                  </button>
                )}
              </div>
            )}

            {/* Edit-mode action overlay — visible on existing image */}
            {editing && (imageUrl || recipe.image_url) && !imageInputVisible && (
              <div className="absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-black/60 to-transparent flex items-end gap-4 px-4 pb-3">
                <button
                  type="button"
                  onClick={() => setImageInputVisible(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white cursor-pointer transition-colors"
                >
                  <Pencil size={11} /> Skift billede
                </button>
                <button
                  type="button"
                  disabled={imageSaving}
                  onClick={() => { setImageUrl(""); setImageError(""); saveImage(null); }}
                  className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
                >
                  <ImageOff size={11} /> Fjern
                </button>
              </div>
            )}

            {/* URL input panel — slides in at the bottom of the hero */}
            {editing && imageInputVisible && (
              <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-sm px-4 py-3 flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <input
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    type="url"
                    value={imageUrl}
                    disabled={imageSaving}
                    onChange={(e) => { setImageUrl(e.target.value); setImageError(""); }}
                    onBlur={() => {
                      const trimmed = imageUrl.trim();
                      if (!imageSaving && trimmed && trimmed !== (recipe.image_url ?? "")) {
                        saveImage(imageUrl);
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text").trim();
                      if (pasted) setTimeout(() => saveImage(pasted), 0);
                    }}
                    placeholder="https://…"
                    className={cn(
                      "flex-1 text-sm rounded-lg border bg-white/10 text-white placeholder:text-white/40 px-3 py-1.5 focus:outline-none transition-colors disabled:opacity-50",
                      imageError ? "border-red-400/60" : "border-white/20 focus:border-white/50",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => { setImageInputVisible(false); setImageError(""); }}
                    className="p-1.5 text-white/60 hover:text-white cursor-pointer transition-colors rounded-lg hover:bg-white/10"
                    aria-label="Luk"
                  >
                    <X size={14} />
                  </button>
                </div>
                {imageSaving && <p className="text-xs text-white/60 m-0">Gemmer…</p>}
                {imageError && !imageSaving && <p className="text-xs text-red-300 m-0">{imageError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="px-5 pt-5 pb-5 flex justify-between items-start gap-4 border-b border-(--color-border)">
          <div className="flex items-start gap-3 min-w-0">
            {!recipe.image_url && (
              <span className="text-4xl leading-none shrink-0 mt-0.5">{recipe.emoji}</span>
            )}
            <div className="min-w-0">
              <h2 className="m-0 text-xl font-bold text-(--color-text) leading-snug tracking-tight">
                {recipe.name}
              </h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-(--color-text-muted)">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} /> {recipe.time_minutes} min
                </span>
                {recipe.servings && (
                  <span className="flex items-center gap-1.5">
                    <UtensilsCrossed size={12} /> {recipe.servings} pers.
                  </span>
                )}
                {recipe.category && (
                  <span className="flex items-center gap-1.5">
                    <FolderOpen size={12} /> {recipe.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center shrink-0 mt-0.5 gap-1">
            <button
              type="button"
              onClick={() => onToggleFavorite?.(recipe.id, !recipe.is_favorite)}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                recipe.is_favorite
                  ? "text-rose-500 hover:bg-rose-50"
                  : "text-(--color-text-muted) hover:text-rose-500 hover:bg-rose-50",
              )}
              aria-label={recipe.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
              title={recipe.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
            >
              <Heart size={16} fill={recipe.is_favorite ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={() => onToggleQueue?.(recipe.id, !recipe.queue_for_next_plan)}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                recipe.queue_for_next_plan
                  ? "text-(--color-primary) hover:bg-(--color-primary)/10"
                  : "text-(--color-text-muted) hover:text-(--color-primary) hover:bg-(--color-primary)/10",
              )}
              aria-label={recipe.queue_for_next_plan ? "Fjern fra næste plan" : "Sæt i kø til næste plan"}
              title={recipe.queue_for_next_plan ? "Fjern fra næste plan" : "Sæt i kø til næste plan"}
            >
              {recipe.queue_for_next_plan ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
            </button>
            <div className="w-px h-5 bg-(--color-border) mx-1 shrink-0" />
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
            <div className="w-px h-5 bg-(--color-border) mx-1 shrink-0" />
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-(--color-text-muted) hover:text-(--color-text) transition-colors cursor-pointer rounded-lg hover:bg-(--color-surface-2)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-(--color-text-muted) text-sm">
            Henter opskrift…
          </div>
        ) : (
          /* Scrollable content region — fills remaining height after hero + header */
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="px-5 pt-5 pb-7 flex flex-col gap-7">

            {/* Ingredients */}
            <section>
              {editing ? (
                <EditSection
                  title="Ingredienser"
                  badge={ingredients.length > 0 ? `${ingredients.length}` : undefined}
                  open={openIngredients}
                  onToggle={() => setOpenIngredients((v) => !v)}
                >
                  <RecipeIngredientEditor
                    recipeId={recipe.id}
                    initialIngredients={ingredients}
                    onIngredientsChange={setIngredients}
                  />
                </EditSection>
              ) : (
              <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) m-0">
                  Ingredienser
                </h3>
                {missingIds.size > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-(--color-danger) font-medium">
                    <TriangleAlert size={11} />
                    {missingIds.size} mangler
                  </span>
                )}
              </div>
              {ingredients.length === 0 ? (
                <p className="text-sm text-(--color-text-muted) italic">
                  Ingen ingredienser tilføjet endnu.
                </p>
              ) : (
                <ul className="list-none p-0 m-0 divide-y divide-(--color-border)">
                  {ingredients.map((ing) => {
                    const missing = missingIds.has(ing.id);
                    return (
                      <li
                        key={ing.id}
                        onClick={() =>
                          setMissingIds((prev) => {
                            const next = new Set(prev);
                            next.has(ing.id) ? next.delete(ing.id) : next.add(ing.id);
                            return next;
                          })
                        }
                        className={cn(
                          "flex justify-between items-center text-sm py-2.5 px-1 cursor-pointer rounded-sm transition-colors",
                          missing
                            ? "text-(--color-danger) hover:bg-(--color-danger-subtle)"
                            : "hover:bg-(--color-surface-2)",
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {missing && <TriangleAlert size={12} className="shrink-0" />}
                          <span className={cn(
                            "truncate",
                            missing ? "line-through opacity-70" : "text-(--color-text)",
                          )}>
                            {ing.name}
                          </span>
                        </span>
                        <span className={cn(
                          "ml-4 shrink-0 tabular-nums text-right",
                          missing ? "opacity-40" : "text-(--color-text-muted)",
                        )}>
                          {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              </>
              )}
            </section>

            {/* Steps — editor in edit mode, stepper in view mode */}
            {(editing || steps.length > 0) && (
              <section>
                {editing ? (
                  <EditSection
                    title="Fremgangsmåde"
                    badge={steps.length > 0 ? `${steps.length} trin` : undefined}
                    open={openSteps}
                    onToggle={() => setOpenSteps((v) => !v)}
                  >
                    <RecipeStepEditor
                      recipeId={recipe.id}
                      initialSteps={steps}
                      onStepsChange={setSteps}
                    />
                  </EditSection>
                ) : (() => {
                  const si = Math.min(currentStep, steps.length - 1);
                  return (
                    <>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mb-3">
                        Fremgangsmåde — trin {si + 1} / {steps.length}
                      </h3>
                      <div className="bg-(--color-surface-2) border border-(--color-border) rounded-xl px-5 py-4 mb-3.5">
                        <div className="text-xs font-semibold text-(--color-primary) mb-2">
                          Trin {steps[si].step_number}
                        </div>
                        <p className="m-0 text-[15px] text-(--color-text) leading-relaxed">
                          {steps[si].description}
                        </p>
                      </div>

                      <div className="flex gap-2.5 items-center">
                        <button
                          type="button"
                          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                          disabled={si === 0}
                          className={cn(stepBtnClass, si === 0 && "opacity-35")}
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
                                i === si ? "bg-(--color-primary)" : "bg-(--color-border)",
                              )}
                            />
                          ))}
                        </div>

                        {si < steps.length - 1 ? (
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
                    </>
                  );
                })()}
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
          </div>
        )}
      </div>
    </>
  );
}

const stepBtnClass =
  "bg-(--color-bg) border border-(--color-border) rounded-lg px-3.5 py-2 text-sm font-medium cursor-pointer text-(--color-text-muted) whitespace-nowrap transition-colors";
