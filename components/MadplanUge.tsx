"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  clearMeal,
  getIngredientsForMealPlan,
  getMealPlan,
  getRecipes,
  getWeekStart,
  setMeal,
} from "@/lib/queries";
import type { Recipe, WeekMeals } from "@/lib/types";
import RecipePicker from "@/components/RecipePicker";
import SelectedDayMealCard from "@/components/SelectedDayMealCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { UtensilsCrossed, ShoppingCart, Sparkles, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

// ── Draggable recipe card ─────────────────────────────────────────────────────

function RecipeKort({
  recipe,
  dragId,
  compact = false,
  imageUrl,
}: {
  recipe: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes">;
  dragId: string;
  compact?: boolean;
  imageUrl?: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: [
          transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : null,
          !isDragging && hovered ? "scale(1.02)" : "scale(1)",
        ]
          .filter(Boolean)
          .join(" "),
      }}
      className={cn(
        "border border-(--color-border) rounded-lg flex items-center gap-2 cursor-grab select-none transition-[box-shadow,transform] duration-150",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        isDragging
          ? "bg-(--color-surface) opacity-40 shadow-none"
          : hovered
          ? "bg-(--color-surface) shadow-md"
          : "bg-(--color-surface) shadow-sm",
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={cn("rounded object-cover shrink-0", compact ? "w-6 h-6" : "w-7 h-7")}
        />
      ) : (
        <span className={compact ? "text-[18px]" : "text-[20px]"}>{recipe.emoji}</span>
      )}
      <span
        className={cn(
          "font-semibold text-(--color-primary-text) overflow-hidden text-ellipsis whitespace-nowrap",
          compact ? "text-[13px]" : "text-[14px]",
        )}
      >
        {recipe.name}
      </span>
      {!compact && (
        <span className="text-xs text-(--color-primary-hover) ml-auto shrink-0">
          {recipe.time_minutes} min
        </span>
      )}
    </div>
  );
}

// ── Droppable day slot ────────────────────────────────────────────────────────

function DagSlot({
  dayIndex,
  meal,
  imageUrl,
  isSelected,
  onSelect,
  onClear,
}: {
  dayIndex: number;
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
  imageUrl?: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${dayIndex}` });

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div
        className={cn(
          "text-[12px] font-bold uppercase tracking-wide transition-colors duration-150",
          isSelected ? "text-(--color-primary)" : "text-(--color-text-mid)",
        )}
      >
        {DAGE[dayIndex]}
      </div>
      <div
        ref={setNodeRef}
        onClick={onSelect}
        className={cn(
          "min-h-20 rounded-xl p-2 flex flex-col justify-center transition-[border-color,background,box-shadow] duration-150 relative cursor-pointer",
          isSelected
            ? "border-2 border-solid border-(--color-primary) bg-(--color-primary-subtle) shadow-sm"
            : isOver
            ? "border-2 border-solid border-(--color-primary) bg-(--color-surface)"
            : meal
            ? "border border-solid border-(--color-border) bg-(--color-surface) shadow-sm"
            : "border border-dashed border-(--color-border) bg-(--color-bg)",
        )}
      >
        {meal ? (
          <>
            <RecipeKort recipe={meal} dragId={`day-${dayIndex}`} compact imageUrl={imageUrl} />
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full border-none bg-(--color-active-bg) text-(--color-primary-hover) cursor-pointer text-xs flex items-center justify-center leading-none p-0"
              title="Fjern ret"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center gap-1",
              isSelected ? "text-(--color-primary)" : "text-(--color-text-muted)",
            )}
          >
            <Plus size={16} />
            <span className="text-[11px] font-medium text-center">Tilføj ret</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drag overlay card ─────────────────────────────────────────────────────────

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

export default function MadplanUge({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [meals, setMeals] = useState<WeekMeals>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingredientCount, setIngredientCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0); // increment to force a re-fetch

  const [activeRecipe, setActiveRecipe] = useState<Pick<
    Recipe,
    "id" | "name" | "emoji" | "time_minutes"
  > | null>(null);

  // Selected day drives the detail card below the grid
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Picker: opens recipe selector for a specific day (add or replace)
  const [pickerForDay, setPickerForDay] = useState<number | null>(null);

  const weekStart = getWeekStart(weekOffset);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setIngredientCount(null);
    Promise.all([
      getMealPlan(familyId, weekStart),
      getRecipes(familyId),
      getIngredientsForMealPlan(familyId, weekStart),
    ])
      .then(([plan, allRecipes, ingredients]) => {
        const map: WeekMeals = {};
        for (const entry of plan ?? []) {
          map[entry.day_of_week] = entry.recipe as Pick<
            Recipe,
            "id" | "name" | "emoji" | "time_minutes"
          >;
        }
        setMeals(map);
        setRecipes((allRecipes as Recipe[]) ?? []);
        setIngredientCount(ingredients.length);
        // Auto-select the first planned day so the detail card is never blank on load
        const firstPlanned = [0, 1, 2, 3, 4, 5, 6].find((i) => map[i] != null) ?? null;
        setSelectedDay(firstPlanned);
      })
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

    if (activeId.startsWith("recipe-")) {
      const recipe = recipes.find((r) => r.id === activeId.slice(7));
      if (!recipe) return;
      setMeals((prev) => ({ ...prev, [targetDay]: recipe }));
      setMeal(familyId, weekStart, targetDay, recipe.id).catch(() =>
        setMeals((prev) => { const n = { ...prev }; delete n[targetDay]; return n; }),
      );
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
      Promise.all(ops).catch(() => {
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
    clearMeal(familyId, weekStart, dayIndex).catch(() =>
      setMeals((m) => ({ ...m, [dayIndex]: prev })),
    );
  }

  function handlePickRecipe(recipe: Recipe, dayIndex: number) {
    setMeals((prev) => ({ ...prev, [dayIndex]: recipe }));
    setMeal(familyId, weekStart, dayIndex, recipe.id).catch(() =>
      setMeals((prev) => { const n = { ...prev }; delete n[dayIndex]; return n; }),
    );
  }

  const monday = new Date(weekStart);
  const sunday = new Date(weekStart);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`;

  const plannedCount = Object.values(meals).filter(Boolean).length;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-(--color-primary-text) text-[26px] font-extrabold m-0">
          Ugens aftensmad
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((o) => o - 1)} className={navBtnClass}>
            <ChevronLeft size={18} /> Forrige
          </button>
          <span className="text-sm font-semibold text-(--color-text-mid) min-w-[140px] text-center">
            {weekLabel}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)} className={navBtnClass}>
            Næste <ChevronRight size={18} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className={cn(navBtnClass, "text-(--color-primary)")}>
              I dag
            </button>
          )}
        </div>
      </div>

      {/* ── Summary bar ────────────────────────────────────────────────────── */}
      <div className="bg-(--color-surface) rounded-xl px-4 py-3 mb-5 flex items-center flex-wrap gap-4 shadow-sm">
        {/* Planned count */}
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed size={15} className="text-(--color-primary)" />
          <span className="text-sm font-semibold text-(--color-text)">
            {plannedCount} / 7 dage planlagt
          </span>
        </div>

        {/* Ingredient count */}
        {ingredientCount !== null && (
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={15} className="text-(--color-text-muted)" />
            <span className="text-sm text-(--color-text-muted)">
              {ingredientCount} varer
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick link to auto-planner — ghost */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-(--color-text-muted) hover:text-(--color-text) rounded-lg px-3 py-1.5 font-semibold text-sm no-underline whitespace-nowrap transition-colors"
        >
          <Sparkles size={14} /> Planlæg uge
        </Link>

        {/* Shopping list CTA */}
        <Link
          href="/shopping-list"
          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-1.5 font-semibold text-sm no-underline whitespace-nowrap hover:bg-(--color-primary-hover) transition-colors"
        >
          <ShoppingCart size={14} /> Indkøbsliste
        </Link>
      </div>

      {/* ── Day grid ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-(--color-text-muted) py-10 text-center text-sm">
          Henter madplan…
        </div>
      ) : loadError ? (
        <div className="bg-(--color-danger-subtle) border border-(--color-danger) rounded-xl px-6 py-5 text-center">
          <div className="text-(--color-danger) font-semibold mb-3">
            ⚠️ {loadError}
          </div>
          <button
            onClick={() => setLoadKey((k) => k + 1)}
            className="bg-(--color-primary) text-white border-none rounded-lg px-4 py-2 font-bold cursor-pointer text-[13px]"
          >
            Prøv igen
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {Array.from({ length: 7 }, (_, i) => (
              <DagSlot
                key={i}
                dayIndex={i}
                meal={meals[i] ?? null}
                imageUrl={meals[i] ? (recipes.find((r) => r.id === meals[i]!.id)?.image_url ?? null) : null}
                isSelected={selectedDay === i}
                onSelect={() => setSelectedDay(i)}
                onClear={() => handleClear(i)}
              />
            ))}
          </div>
          {/* Empty week guidance */}
          {plannedCount === 0 && (
            <div className="text-center py-3 text-(--color-text-muted) text-sm">
              Ingen retter planlagt denne uge.{" "}
              <Link href="/" className="text-(--color-primary) font-semibold underline-offset-2 hover:underline">
                Brug auto-planlæggeren →
              </Link>
            </div>
          )}
        </>
      )}

      {/* Drag overlay */}
      <DragOverlay>
        {activeRecipe && <DragOverlayKort recipe={activeRecipe} />}
      </DragOverlay>

      {/* ── Selected day detail card ───────────────────────────────────────── */}
      {selectedDay !== null && (
        <SelectedDayMealCard
          dayIndex={selectedDay}
          meal={meals[selectedDay] ?? null}
          fullRecipe={
            meals[selectedDay]
              ? (recipes.find((r) => r.id === meals[selectedDay]!.id) ?? null)
              : null
          }
          onClear={() => {
            handleClear(selectedDay);
            // Keep the day selected so user sees the empty state
          }}
          onSwitch={() => setPickerForDay(selectedDay)}
          onViewRecipe={() => router.push("/opskrifter")}
        />
      )}

      {/* ── Recipe picker (add / replace a meal) ───────────────────────────── */}
      {pickerForDay !== null && (
        <RecipePicker
          recipes={recipes}
          title={`Vælg ret til ${DAGE[pickerForDay]}`}
          onSelect={(recipe) => handlePickRecipe(recipe, pickerForDay)}
          onClose={() => setPickerForDay(null)}
        />
      )}
    </DndContext>
  );
}

const navBtnClass =
  "bg-(--color-surface) border border-(--color-border) rounded-lg px-3 py-1.5 cursor-pointer text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) hover:border-(--color-text-muted) inline-flex items-center gap-1 transition-colors";
