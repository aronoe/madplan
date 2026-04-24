"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  clearMeal,
  getMealPlan,
  getRecipes,
  getActiveOffers,
  getRecipeIngredientOverlap,
  getWeekStart,
  addWeeks,
  setMeal,
} from "@/lib/queries";
import type { Recipe, WeekMeals, StoreOffer } from "@/lib/types";
import { invalidateCurrentWeekBadge } from "@/lib/shoppingBadgeStore";
import RecipePicker from "@/components/RecipePicker";
import SelectedDayMealCard from "@/components/SelectedDayMealCard";
import { RecipeImageThumb } from "@/components/RecipeImage";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
const DAGE_SHORT = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

// 0 = Monday … 6 = Sunday (matches DB day_of_week)
function todayDayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ── Compact day slot ──────────────────────────────────────────────────────────

function DagSlot({
  dayIndex,
  meal,
  imageUrl,
  isSelected,
  isToday,
  onSelect,
}: {
  dayIndex: number;
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
  imageUrl?: string | null;
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${dayIndex}` });

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wide",
          isToday ? "text-(--color-primary)" : "text-(--color-text-muted)",
        )}
      >
        {DAGE_SHORT[dayIndex]}
      </span>
      <div
        ref={setNodeRef}
        onClick={onSelect}
        className={cn(
          "w-full h-9 rounded-lg overflow-hidden transition-all duration-150 cursor-pointer",
          isSelected
            ? "border-2 border-(--color-primary)"
            : isOver
            ? "border-2 border-(--color-primary)/50"
            : meal
            ? "border border-(--color-border) shadow-sm"
            : isToday
            ? "border border-dashed border-(--color-border)"
            : "border border-dashed border-(--color-border)/40",
        )}
      >
        {meal ? (
          <RecipeImageThumb imageUrl={imageUrl} name={meal.name} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
            <Plus size={10} className="text-(--color-text-muted)/40" />
            <span className="text-[7px] font-semibold text-(--color-text-muted)/40 uppercase tracking-wide leading-none">
              Planlæg
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drag overlay ──────────────────────────────────────────────────────────────

function DragOverlayKort({
  recipe,
}: {
  recipe: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes">;
}) {
  return (
    <div className="bg-(--color-surface) border-2 border-(--color-primary) rounded-lg px-3.5 py-2 flex items-center gap-2 shadow-xl cursor-grabbing text-sm font-semibold text-(--color-text)">
      <span className="text-[20px]">{recipe.emoji}</span>
      {recipe.name}
      <span className="text-xs text-(--color-primary-hover) ml-1">
        {recipe.time_minutes} min
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MadplanUge({ familyId, initialWeekStart, jumpToTodayKey }: { familyId: string; initialWeekStart?: string; jumpToTodayKey?: number }) {
  const [weekStart, setWeekStart] = useState(initialWeekStart ?? getWeekStart(0));
  const [meals, setMeals] = useState<WeekMeals>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [offers, setOffers] = useState<StoreOffer[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [ingredientRecipeMap, setIngredientRecipeMap] = useState<Record<string, string[]>>({});
  const [selectedOfferIngredientId, setSelectedOfferIngredientId] = useState<string | null>(null);
  const [showOffers, setShowOffers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  const [activeRecipe, setActiveRecipe] = useState<Pick<
    Recipe,
    "id" | "name" | "emoji" | "time_minutes"
  > | null>(null);

  // Always start on today; user can navigate from there
  const [selectedDay, setSelectedDay] = useState<number>(todayDayIndex());
  const [pickerForDay, setPickerForDay] = useState<number | null>(null);

  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const prevJumpKey = useRef(jumpToTodayKey ?? 0);

  useEffect(() => {
    const key = jumpToTodayKey ?? 0;
    if (key === prevJumpKey.current) return;
    prevJumpKey.current = key;
    setWeekStart(getWeekStart(0));
    setSelectedDay(todayDayIndex());
  }, [jumpToTodayKey]);

  function handleSwipeTouchStart(e: React.TouchEvent) {
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleSwipeTouchEnd(e: React.TouchEvent) {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeRef.current.y;
    swipeRef.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) setSelectedDay((d) => Math.min(6, d + 1));
    else setSelectedDay((d) => Math.max(0, d - 1));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    const load = async () => {
      const [plan, allRecipes, activeOffers] = await Promise.all([
        getMealPlan(familyId, weekStart),
        getRecipes(familyId),
        getActiveOffers(),
      ]);

      const map: WeekMeals = {};
      for (const entry of plan ?? []) {
        map[entry.day_of_week] = entry.recipe as Pick<
          Recipe,
          "id" | "name" | "emoji" | "time_minutes"
        >;
      }
      setMeals(map);

      const loadedRecipes = (allRecipes as Recipe[]) ?? [];
      setRecipes(loadedRecipes);
      setOffers(activeOffers);

      const offerIngredientIds = activeOffers
        .map((o) => o.ingredient_id)
        .filter((id): id is string => id !== null);
      const { counts, byIngredient } = await getRecipeIngredientOverlap(
        loadedRecipes.map((r) => r.id),
        offerIngredientIds,
      );
      setOfferCounts(counts);
      setIngredientRecipeMap(byIngredient);
    };

    load()
      .catch(() =>
        setLoadError("Kunne ikke hente madplanen. Tjek din forbindelse og prøv igen."),
      )
      .finally(() => setLoading(false));
  }, [familyId, weekStart, loadKey]);


  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("recipe-")) {
      setActiveRecipe(recipes.find((r) => r.id === id.slice(7)) ?? null);
    } else if (id.startsWith("day-")) {
      setActiveRecipe(meals[parseInt(id.slice(4))] ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveRecipe(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId?.startsWith("slot-")) return;
    const targetDay = parseInt(overId.slice(5));

    const isCurrentWeek = weekStart === getWeekStart(0);

    if (activeId.startsWith("recipe-")) {
      const recipe = recipes.find((r) => r.id === activeId.slice(7));
      if (!recipe) return;
      setMeals((prev) => ({ ...prev, [targetDay]: recipe }));
      setMeal(familyId, weekStart, targetDay, recipe.id)
        .then(() => { if (isCurrentWeek) invalidateCurrentWeekBadge(); })
        .catch(() => setMeals((prev) => { const n = { ...prev }; delete n[targetDay]; return n; }));
    } else if (activeId.startsWith("day-")) {
      const sourceDay = parseInt(activeId.slice(4));
      if (sourceDay === targetDay) return;
      const sourceMeal = meals[sourceDay] ?? null;
      const targetMeal = meals[targetDay] ?? null;
      setMeals((prev) => {
        const next = { ...prev };
        if (sourceMeal) next[targetDay] = sourceMeal; else delete next[targetDay];
        if (targetMeal) next[sourceDay] = targetMeal; else delete next[sourceDay];
        return next;
      });
      const ops: Promise<void>[] = [];
      if (sourceMeal) ops.push(setMeal(familyId, weekStart, targetDay, sourceMeal.id));
      else ops.push(clearMeal(familyId, weekStart, targetDay));
      if (targetMeal) ops.push(setMeal(familyId, weekStart, sourceDay, targetMeal.id));
      else ops.push(clearMeal(familyId, weekStart, sourceDay));
      Promise.all(ops)
        .then(() => { if (isCurrentWeek) invalidateCurrentWeekBadge(); })
        .catch(() => {
          setMeals((prev) => {
            const next = { ...prev };
            if (targetMeal) next[targetDay] = targetMeal; else delete next[targetDay];
            if (sourceMeal) next[sourceDay] = sourceMeal; else delete next[sourceDay];
            return next;
          });
        });
    }
  }

  function handleClear(dayIndex: number) {
    const prev = meals[dayIndex];
    setMeals((m) => { const n = { ...m }; delete n[dayIndex]; return n; });
    clearMeal(familyId, weekStart, dayIndex)
      .then(() => { if (weekStart === getWeekStart(0)) invalidateCurrentWeekBadge(); })
      .catch(() => setMeals((m) => ({ ...m, [dayIndex]: prev })));
  }

  function handlePickRecipe(recipe: Recipe, dayIndex: number) {
    setMeals((prev) => ({ ...prev, [dayIndex]: recipe }));
    setMeal(familyId, weekStart, dayIndex, recipe.id)
      .then(() => { if (weekStart === getWeekStart(0)) invalidateCurrentWeekBadge(); })
      .catch(() => setMeals((prev) => { const n = { ...prev }; delete n[dayIndex]; return n; }));
  }

  const [wy, wm, wd] = weekStart.split("-").map(Number);
  const monday = new Date(wy, wm - 1, wd);
  const sunday = new Date(wy, wm - 1, wd + 6);
  const fmt = (d: Date) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`;
  const isCurrentWeek = weekStart === getWeekStart(0);
  const todayIndex = todayDayIndex();
  const plannedCount = Object.values(meals).filter(Boolean).length;

  const highlightedRecipeIds: Set<string> = selectedOfferIngredientId
    ? new Set(ingredientRecipeMap[selectedOfferIngredientId] ?? [])
    : new Set();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {/* ── Week header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">
            Uge {getISOWeek(monday)}
          </span>
          <span className="text-sm font-medium text-(--color-text) mt-0.5">
            {weekLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
            className={navBtnClass}
            aria-label="Forrige uge"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className={navBtnClass}
            aria-label="Næste uge"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-(--color-text-muted) py-16 text-center text-sm">
          Henter madplan…
        </div>
      ) : loadError ? (
        <div className="bg-(--color-danger-subtle) border border-(--color-danger) rounded-xl px-6 py-5 text-center">
          <div className="text-(--color-danger) font-semibold mb-3">⚠️ {loadError}</div>
          <button
            onClick={() => setLoadKey((k) => k + 1)}
            className="bg-(--color-primary) text-white border-none rounded-lg px-4 py-2 font-bold cursor-pointer text-[13px]"
          >
            Prøv igen
          </button>
        </div>
      ) : (
        <>
          {/* ── Active day card ──────────────────────────────────────────────── */}
          <div
            onTouchStart={handleSwipeTouchStart}
            onTouchEnd={handleSwipeTouchEnd}
            style={{ touchAction: "pan-y" }}
          >
            <SelectedDayMealCard
              familyId={familyId}
              dayIndex={selectedDay}
              weekStart={weekStart}
              meal={meals[selectedDay] ?? null}
              fullRecipe={
                meals[selectedDay]
                  ? (recipes.find((r) => r.id === meals[selectedDay]!.id) ?? null)
                  : null
              }
              onClear={() => handleClear(selectedDay)}
              onSwitch={() => setPickerForDay(selectedDay)}
              offers={offers}
            />
          </div>
          <p className="sm:hidden text-center text-xs text-(--color-text-muted)/40 mt-2 select-none">
            ← Swipe mellem dage →
          </p>

          {/* ── Secondary: compact week strip ───────────────────────────────── */}
          <div className="grid grid-cols-7 gap-2 mt-4">
            {Array.from({ length: 7 }, (_, i) => (
              <DagSlot
                key={i}
                dayIndex={i}
                meal={meals[i] ?? null}
                imageUrl={meals[i] ? (recipes.find((r) => r.id === meals[i]!.id)?.image_url ?? null) : null}
                isSelected={selectedDay === i}
                isToday={isCurrentWeek && i === todayIndex}
                onSelect={() => meals[i] ? setSelectedDay(i) : setPickerForDay(i)}
              />
            ))}
          </div>

          {/* Empty week hint */}
          {plannedCount === 0 && (
            <div className="text-center mt-4 text-(--color-text-muted) text-sm">
              Ingen retter planlagt denne uge.{" "}
              <Link
                href="/plan"
                className="text-(--color-primary) font-semibold underline-offset-2 hover:underline"
              >
                Brug auto-planlæggeren →
              </Link>
            </div>
          )}

          {/* ── Ugens tilbud (collapsible) ────────────────────────────────── */}
          {offers.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowOffers((v) => !v)}
                className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                {showOffers ? "Skjul tilbud" : `Se ugens tilbud (${offers.length})`}
              </button>
            </div>
          )}
          {showOffers && offers.length > 0 && (
            <div className="mt-2 bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-(--color-border)">
                <span className="text-xs font-bold uppercase tracking-wide text-(--color-text-muted)">
                  Ugens tilbud
                </span>
              </div>
              <div className="divide-y divide-(--color-border)/40">
                {offers.map((offer) => {
                  const isSelected = offer.ingredient_id !== null && selectedOfferIngredientId === offer.ingredient_id;
                  const matchCount = offer.ingredient_id ? (ingredientRecipeMap[offer.ingredient_id]?.length ?? 0) : 0;
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() =>
                        setSelectedOfferIngredientId(
                          isSelected ? null : (offer.ingredient_id ?? null),
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isSelected
                          ? "bg-green-50 border-l-2 border-l-green-500"
                          : offer.ingredient_id
                            ? "hover:bg-(--color-surface-2) cursor-pointer"
                            : "cursor-default",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-(--color-text) truncate block">{offer.product_name}</span>
                        <span className="text-xs text-(--color-text-muted)">
                          {offer.store ?? ""}
                          {matchCount > 0 && (
                            <span className={cn("ml-1", isSelected ? "text-green-600 font-medium" : "")}>
                              · {matchCount} {matchCount === 1 ? "opskrift" : "opskrifter"}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-green-600">{offer.offer_price} kr</span>
                        {offer.normal_price != null && (
                          <span className="text-xs text-(--color-text-muted) line-through ml-1.5">
                            {offer.normal_price} kr
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <DragOverlay>
        {activeRecipe && <DragOverlayKort recipe={activeRecipe} />}
      </DragOverlay>

      {pickerForDay !== null && (
        <RecipePicker
          recipes={recipes}
          title={`Vælg ret til ${DAGE[pickerForDay]}`}
          offerCounts={offerCounts}
          highlightedRecipeIds={highlightedRecipeIds}
          onSelect={(recipe) => handlePickRecipe(recipe, pickerForDay)}
          onClose={() => setPickerForDay(null)}
        />
      )}
    </DndContext>
  );
}

const navBtnClass =
  "bg-(--color-surface) border border-(--color-border) rounded-lg p-1.5 cursor-pointer text-(--color-text-muted) hover:text-(--color-text) hover:border-(--color-text-muted) inline-flex items-center transition-colors";
