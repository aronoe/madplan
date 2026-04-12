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
import { cn } from "@/lib/cn";
import { UtensilsCrossed, ShoppingCart, Sparkles, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

// ── Draggable recipe card ─────────────────────────────────────────────────────

function RecipeKort({
  recipe,
  dragId,
  compact = false,
}: {
  recipe: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes">;
  dragId: string;
  compact?: boolean;
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
        "border border-(--color-primary-subtle) rounded-[10px] flex items-center gap-2 cursor-grab select-none transition-[box-shadow,transform] duration-150",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        isDragging
          ? "bg-(--color-primary-subtle) opacity-40 shadow-none"
          : hovered
          ? "bg-white shadow-[0_4px_12px_rgba(0,80,40,.13)]"
          : "bg-white shadow-[0_1px_4px_rgba(0,80,40,.06)]",
      )}
    >
      <span className={compact ? "text-[18px]" : "text-[20px]"}>{recipe.emoji}</span>
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
  isSelected,
  onSelect,
  onClear,
}: {
  dayIndex: number;
  meal: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null;
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
          "min-h-[80px] rounded-xl p-2 flex flex-col justify-center transition-[border-color,background] duration-150 relative cursor-pointer",
          isSelected
            ? "border-2 border-solid border-(--color-primary) bg-(--color-active-bg) shadow-[0_0_0_3px_rgba(76,175,130,.18)]"
            : isOver
            ? "border-2 border-solid border-(--color-primary) bg-(--color-primary-subtle)"
            : meal
            ? "border-2 border-solid border-(--color-primary-subtle) bg-white shadow-[0_1px_6px_rgba(0,80,40,.07)]"
            : "border-2 border-dashed border-(--color-primary-subtle) bg-(--color-active-bg)",
        )}
      >
        {meal ? (
          <>
            <RecipeKort recipe={meal} dragId={`day-${dayIndex}`} compact />
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
              isSelected ? "text-(--color-primary)" : "text-(--color-border)",
            )}
          >
            <Plus size={16} />
            <span className="text-[11px] font-semibold text-center">Tilføj ret</span>
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
    <div className="bg-white border-2 border-(--color-primary) rounded-[10px] px-3.5 py-2 flex items-center gap-2 shadow-[0_8px_24px_rgba(0,80,40,.18)] cursor-grabbing text-sm font-semibold text-(--color-primary-text)">
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
      <div className="bg-white border border-(--color-primary-subtle) rounded-xl px-4 py-3 mb-5 flex items-center flex-wrap gap-4">
        {/* Planned count */}
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed size={16} className="text-(--color-primary)" />
          <span className="text-sm font-bold text-(--color-primary-text)">
            {plannedCount} / 7 dage planlagt
          </span>
        </div>

        {/* Ingredient count */}
        {ingredientCount !== null && (
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={16} className="text-(--color-text-mid)" />
            <span className="text-sm font-semibold text-(--color-text-mid)">
              {ingredientCount} varer på listen
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shopping list CTA */}
        <a
          href="/shopping-list"
          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-1.5 font-bold text-[13px] no-underline whitespace-nowrap"
        >
          <ShoppingCart size={14} /> Se indkøbsliste
        </a>

        {/* Quick link to auto-planner */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 bg-(--color-active-bg) text-(--color-primary-text) border border-(--color-primary-subtle) rounded-lg px-3.5 py-1.5 font-bold text-[13px] no-underline whitespace-nowrap"
        >
          <Sparkles size={14} /> Planlæg uge
        </a>
      </div>

      {/* ── Day grid ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-(--color-primary-hover) py-10 text-center">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-7">
            {Array.from({ length: 7 }, (_, i) => (
              <DagSlot
                key={i}
                dayIndex={i}
                meal={meals[i] ?? null}
                isSelected={selectedDay === i}
                onSelect={() => setSelectedDay(i)}
                onClear={() => handleClear(i)}
              />
            ))}
          </div>
          {/* Empty week guidance */}
          {plannedCount === 0 && (
            <div className="text-center py-3 text-(--color-primary-hover) text-sm">
              Ingen retter planlagt denne uge.{" "}
              <a href="/" className="text-(--color-primary) font-bold">
                Brug auto-planlæggeren →
              </a>
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
          onViewRecipe={() => window.open("/opskrifter", "_self")}
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
  "bg-white border border-(--color-primary-subtle) rounded-lg px-3 py-1.5 cursor-pointer text-[13px] font-semibold text-(--color-text-mid) inline-flex items-center gap-1";
