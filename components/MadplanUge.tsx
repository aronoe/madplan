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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId });
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDragging ? "#d4eddf" : "white",
        border: "1.5px solid #d4eddf",
        borderRadius: 10,
        padding: compact ? "6px 10px" : "8px 12px",
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: isDragging ? 0.4 : 1,
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        boxShadow: isDragging ? "none" : hovered ? "0 4px 12px rgba(0,80,40,.13)" : "0 1px 4px rgba(0,80,40,.06)",
        transform: !isDragging && hovered ? "scale(1.02)" : "scale(1)",
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: compact ? 18 : 20 }}>{recipe.emoji}</span>
      <span
        style={{
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          color: "#1a5c35",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {recipe.name}
      </span>
      {!compact && (
        <span style={{ fontSize: 12, color: "#7aad8a", marginLeft: "auto", flexShrink: 0 }}>
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

  // Derive border: selected > drop-over > meal-filled > empty
  const borderColor = isSelected ? "#4caf82" : isOver ? "#4caf82" : meal ? "#d4eddf" : "#d4eddf";
  const borderStyle = isSelected || meal ? "solid" : "dashed";
  const borderWidth = isSelected ? 2 : 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: isSelected ? "#4caf82" : "#5a7a66",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          transition: "color 0.15s",
        }}
      >
        {DAGE[dayIndex]}
      </div>
      <div
        ref={setNodeRef}
        onClick={onSelect}
        style={{
          minHeight: 80,
          borderRadius: 12,
          border: `${borderWidth}px ${borderStyle} ${borderColor}`,
          background: isOver ? "#e8f8ef" : isSelected ? "#f0faf4" : meal ? "white" : "#f8fdfb",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          transition: "border-color 0.15s, background 0.15s",
          position: "relative",
          boxShadow: isSelected
            ? "0 0 0 3px rgba(76,175,130,.18)"
            : meal
            ? "0 1px 6px rgba(0,80,40,.07)"
            : "none",
          cursor: "pointer",
        }}
      >
        {meal ? (
          <>
            <RecipeKort recipe={meal} dragId={`day-${dayIndex}`} compact />
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "none",
                background: "#f0faf4",
                color: "#7aad8a",
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                padding: 0,
              }}
              title="Fjern ret"
            >
              ×
            </button>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: isSelected ? "#4caf82" : "#b0cfba",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
            <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center" }}>Tilføj ret</span>
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
    <div
      style={{
        background: "white",
        border: "2px solid #4caf82",
        borderRadius: 10,
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 8px 24px rgba(0,80,40,.18)",
        cursor: "grabbing",
        fontSize: 14,
        fontWeight: 600,
        color: "#1a5c35",
      }}
    >
      <span style={{ fontSize: 20 }}>{recipe.emoji}</span>
      {recipe.name}
      <span style={{ fontSize: 12, color: "#7aad8a", marginLeft: 4 }}>
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h1 style={{ color: "#1a5c35", fontSize: 26, fontWeight: 800, margin: 0 }}>
          Ugens aftensmad
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekOffset((o) => o - 1)} style={navBtnStyle}>← Forrige</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#5a7a66", minWidth: 140, textAlign: "center" }}>
            {weekLabel}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)} style={navBtnStyle}>Næste →</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, color: "#4caf82" }}>
              I dag
            </button>
          )}
        </div>
      </div>

      {/* ── Summary bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "white",
          border: "1.5px solid #d4eddf",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Planned count */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🍽️</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a5c35" }}>
            {plannedCount} / 7 dage planlagt
          </span>
        </div>

        {/* Ingredient count */}
        {ingredientCount !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <span style={{ fontSize: 14, color: "#5a7a66", fontWeight: 600 }}>
              {ingredientCount} varer på listen
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Shopping list CTA */}
        <a
          href="/shopping-list"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#4caf82",
            color: "white",
            borderRadius: 8,
            padding: "7px 14px",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          🛒 Se indkøbsliste
        </a>

        {/* Quick link to auto-planner */}
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--c-active-bg, #e8f8ef)",
            color: "#1a5c35",
            border: "1.5px solid #d4eddf",
            borderRadius: 8,
            padding: "7px 14px",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          ✨ Planlæg uge
        </a>
      </div>

      {/* ── Day grid ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ color: "#7aad8a", padding: "40px 0", textAlign: "center" }}>
          Henter madplan…
        </div>
      ) : loadError ? (
        <div
          style={{
            background: "#fff0f0",
            border: "1.5px solid #f5c6c6",
            borderRadius: 12,
            padding: "20px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#c0392b", fontWeight: 600, marginBottom: 12 }}>
            ⚠️ {loadError}
          </div>
          <button
            onClick={() => setLoadKey((k) => k + 1)}
            style={{
              background: "#4caf82",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Prøv igen
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 10,
              marginBottom: 28,
            }}
          >
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
            <div
              style={{
                textAlign: "center",
                padding: "12px 0 8px",
                color: "#7aad8a",
                fontSize: 14,
              }}
            >
              Ingen retter planlagt denne uge.{" "}
              <a href="/" style={{ color: "#4caf82", fontWeight: 700 }}>
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

const navBtnStyle: React.CSSProperties = {
  background: "white",
  border: "1.5px solid #d4eddf",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: "#5a7a66",
};
