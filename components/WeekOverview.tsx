"use client";

import { useEffect, useState } from "react";
import {
  getMealPlanSummaries,
  getMealPlan,
  getRecipes,
  getIngredientsForMealPlan,
  getShoppingChecked,
  setMeal,
  clearWeekMeals,
  updateRecipe,
  getWeekStart,
  addWeeks,
} from "@/lib/queries";
import { autoSelectRecipes } from "@/lib/autoSelect";
import { invalidateCurrentWeekBadge } from "@/lib/shoppingBadgeStore";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Fragment } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Zap, Trash2, Pencil, Check, X, RefreshCw, ShoppingCart, CheckCircle2 } from "lucide-react";
import type { MealStatus } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAGE_SHORT = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const WEEKS_AHEAD = 8;

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDateRange(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y, m - 1, d);
  const sunday = new Date(y, m - 1, d + 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

type Status = "planned" | "partial" | "empty";

function getStatus(count: number): Status {
  if (count >= 5) return "planned";
  if (count > 0) return "partial";
  return "empty";
}


interface DaySlot {
  recipeId: string;
  name: string;
  emoji: string;
  status: MealStatus;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeekOverview({
  familyId,
  onQueueChanged,
}: {
  familyId: string;
  onQueueChanged?: () => void;
}) {
  const currentWeekStart = getWeekStart(0);
  const weekStarts = Array.from({ length: WEEKS_AHEAD }, (_, i) =>
    addWeeks(currentWeekStart, i),
  );

  const [summaries, setSummaries] = useState<Record<string, number[]>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<(DaySlot | null)[] | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedSaving, setExpandedSaving] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [originalSlots, setOriginalSlots] = useState<(DaySlot | null)[] | null>(null);
  const [missingCount, setMissingCount] = useState(0);

  useEffect(() => {
    setLoadingSummaries(true);
    getMealPlanSummaries(familyId, weekStarts)
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setLoadingSummaries(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, refreshKey]);

  // ── Accordion toggle ─────────────────────────────────────────────────────

  function toggleWeek(ws: string) {
    if (expandedWeek === ws) {
      setExpandedWeek(null);
      setExpandedSlots(null);
      setExpandedError(null);
      setIsEditing(false);
      setOriginalSlots(null);
      setMissingCount(0);
      return;
    }

    setExpandedWeek(ws);
    setExpandedSlots(null);
    setExpandedError(null);
    setIsEditing(false);
    setOriginalSlots(null);
    setMissingCount(0);
    setExpandedLoading(true);

    Promise.all([
      getMealPlan(familyId, ws),
      getIngredientsForMealPlan(familyId, ws),
      getShoppingChecked(familyId, ws),
    ])
      .then(([data, ingredients, checkedIds]) => {
        const grid = Array(7).fill(null) as (DaySlot | null)[];
        for (const entry of (data ?? []) as Array<{
          day_of_week: number;
          recipe_id: string;
          recipe: { name: string; emoji: string } | null;
          status?: string;
        }>) {
          if (entry.day_of_week >= 0 && entry.day_of_week < 7) {
            grid[entry.day_of_week] = {
              recipeId: entry.recipe_id,
              name: entry.recipe?.name ?? "Ukendt ret",
              emoji: entry.recipe?.emoji ?? "🍽️",
              status: (entry.status ?? "planned") as MealStatus,
            };
          }
        }
        setExpandedSlots(grid);
        setMissingCount(ingredients.filter((ing) => !checkedIds.has(ing.id)).length);
      })
      .catch(console.error)
      .finally(() => setExpandedLoading(false));
  }

  // ── Edit mode ────────────────────────────────────────────────────────────

  function enterEditMode() {
    setOriginalSlots(expandedSlots ? [...expandedSlots] : null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setExpandedSlots(originalSlots);
    setOriginalSlots(null);
    setIsEditing(false);
  }

  function moveSlot(i: number, direction: "up" | "down") {
    if (!expandedSlots) return;
    const target = direction === "up" ? i - 1 : i + 1;
    if (target < 0 || target >= expandedSlots.length) return;
    const next = [...expandedSlots];
    [next[i], next[target]] = [next[target], next[i]];
    setExpandedSlots(next);
  }

  async function handleSave(ws: string) {
    if (!expandedSlots) return;
    setExpandedSaving(true);
    setExpandedError(null);
    try {
      await clearWeekMeals(familyId, ws);
      for (let i = 0; i < expandedSlots.length; i++) {
        if (expandedSlots[i]) {
          await setMeal(familyId, ws, i, expandedSlots[i]!.recipeId);
        }
      }
      const plannedDays = expandedSlots.map((s, i) => s ? i : -1).filter((i): i is number => i >= 0);
      setSummaries((prev) => ({ ...prev, [ws]: plannedDays }));
      setOriginalSlots(null);
      setIsEditing(false);
      if (ws === getWeekStart(0)) invalidateCurrentWeekBadge();
    } catch {
      setExpandedError("Kunne ikke gemme ændringer.");
    } finally {
      setExpandedSaving(false);
    }
  }

  // ── Autoplan ──────────────────────────────────────────────────────────────

  async function handleAutoplan(ws: string) {
    if ((summaries[ws] ?? []).length > 0 && !confirm("Ugen har allerede retter planlagt. Vil du erstatte dem?")) return;

    setExpandedSaving(true);
    setExpandedError(null);
    try {
      const allRecipes = (await getRecipes(familyId)) as Recipe[];
      if (allRecipes.length === 0) {
        setExpandedError("Ingen opskrifter fundet. Tilføj opskrifter under Opskrifter.");
        return;
      }
      const plan = autoSelectRecipes([], allRecipes, 7);
      await clearWeekMeals(familyId, ws);
      for (let i = 0; i < plan.length; i++) {
        await setMeal(familyId, ws, i, plan[i].id);
      }
      const queuedUsed = plan.filter((r) => r.queue_for_next_plan);
      await Promise.all(
        queuedUsed.map((r) =>
          updateRecipe(r.id, { queue_for_next_plan: false, queue_order: null }),
        ),
      );
      const newGrid = Array(7).fill(null) as (DaySlot | null)[];
      for (let i = 0; i < plan.length; i++) {
        newGrid[i] = { recipeId: plan[i].id, name: plan[i].name, emoji: plan[i].emoji, status: "planned" };
      }

      const [newIngredients, checkedIds] = await Promise.all([
        getIngredientsForMealPlan(familyId, ws),
        getShoppingChecked(familyId, ws),
      ]);

      setExpandedWeek(ws);
      setExpandedSlots(newGrid);
      setSummaries((prev) => ({ ...prev, [ws]: plan.map((_, i) => i) }));
      setMissingCount(newIngredients.filter((ing) => !checkedIds.has(ing.id)).length);
      if (ws === getWeekStart(0)) invalidateCurrentWeekBadge();
      if (queuedUsed.length > 0) onQueueChanged?.();
    } catch {
      setExpandedError("Kunne ikke generere planen. Prøv igen.");
    } finally {
      setExpandedSaving(false);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  async function handleReset(ws: string) {
    if (!confirm("Nulstil hele ugen? Alle planlagte retter fjernes.")) return;

    setExpandedSaving(true);
    setExpandedError(null);
    try {
      await clearWeekMeals(familyId, ws);
      setExpandedSlots(Array(7).fill(null));
      setSummaries((prev) => ({ ...prev, [ws]: [] }));
      setMissingCount(0);
      setIsEditing(false);
      setOriginalSlots(null);
      if (ws === getWeekStart(0)) invalidateCurrentWeekBadge();
    } catch {
      setExpandedError("Kunne ikke nulstille ugen.");
    } finally {
      setExpandedSaving(false);
    }
  }

  // ── Per-slot edit actions ─────────────────────────────────────────────────

  function handleRemoveSlot(i: number) {
    if (!expandedSlots) return;
    const next = [...expandedSlots];
    next[i] = null;
    setExpandedSlots(next);
  }

  async function handleReplaceSlot(i: number) {
    if (!expandedSlots) return;
    const allRecipes = (await getRecipes(familyId)) as Recipe[];
    const usedIds = new Set(expandedSlots.filter(Boolean).map((s) => s!.recipeId));
    const available = allRecipes.filter((r) => !usedIds.has(r.id));
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    const next = [...expandedSlots];
    next[i] = { recipeId: pick.id, name: pick.name, emoji: pick.emoji, status: "planned" };
    setExpandedSlots(next);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {weekStarts.map((ws) => {
        const monday = new Date(ws.replace(/-/g, "/"));
        const weekNum = getISOWeek(monday);
        const count = (summaries[ws] ?? []).length;
        const status = loadingSummaries ? "empty" : getStatus(count);
        const isCurrentWeek = ws === currentWeekStart;
        const isExpanded = expandedWeek === ws;

        return (
          <div
            key={ws}
            className={cn(
              "rounded-xl border overflow-hidden transition-colors duration-150",
              isCurrentWeek ? "bg-(--color-primary)/5" : "bg-(--color-surface)",
              isExpanded
                ? "border-(--color-primary)"
                : isCurrentWeek
                  ? "border-(--color-border) border-l-[3px] border-l-(--color-primary)"
                  : "border-(--color-border)",
            )}
          >
            {/* ── Header row ── */}
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={() => toggleWeek(ws)}
                className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0 text-left cursor-pointer hover:bg-(--color-surface-2) transition-colors"
              >
                <div className="w-20 shrink-0 flex items-baseline gap-1.5">
                  <span className={cn(
                    "text-sm font-bold",
                    isCurrentWeek ? "text-(--color-primary)" : "text-(--color-text)",
                  )}>
                    Uge {weekNum}
                  </span>
                  {isCurrentWeek && (
                    <span className="text-[10px] font-medium text-(--color-text-muted)">
                      · nu
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-sm text-(--color-text-muted) truncate">
                  {formatDateRange(ws)}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* 7-day dots */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 7 }, (_, d) => {
                      const planned = !loadingSummaries && (summaries[ws] ?? []).includes(d);
                      return (
                        <span
                          key={d}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            planned ? "bg-(--color-primary)" : "bg-(--color-border) opacity-60",
                          )}
                        />
                      );
                    })}
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-(--color-text-muted) transition-transform duration-200 shrink-0",
                      isExpanded && "rotate-180",
                    )}
                  />
                </div>
              </button>

            </div>

            {/* ── Expanded section ── */}
            {isExpanded && (
              <div className="border-t border-(--color-border) bg-(--color-surface-2) px-5 pt-4 pb-5 flex flex-col gap-4">

                {/* Action row */}
                <div className="flex items-center gap-2 pb-3 border-b border-(--color-border)">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSave(ws)}
                        disabled={expandedSaving}
                        className="inline-flex items-center gap-1.5 h-8 bg-(--color-primary) text-white rounded-lg px-3 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={13} />
                        {expandedSaving ? "Gemmer…" : "Gem"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={expandedSaving}
                        className="inline-flex items-center gap-1.5 h-8 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3 text-sm font-semibold cursor-pointer transition-colors hover:border-(--color-text-muted) hover:text-(--color-text) disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <X size={13} />
                        Annuller
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReset(ws)}
                        disabled={expandedSaving || (expandedSlots?.every((s) => s === null) ?? true)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-semibold text-(--color-text-muted) rounded-lg cursor-pointer transition-colors hover:text-(--color-danger) disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                        Nulstil
                      </button>
                    </>
                  ) : status === "empty" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAutoplan(ws)}
                        disabled={expandedSaving}
                        className="inline-flex items-center gap-1.5 h-8 bg-(--color-primary) text-white rounded-lg px-3 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Zap size={13} />
                        {expandedSaving ? "Arbejder…" : "Autoplanlæg"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWeek(ws)}
                        className="inline-flex items-center h-8 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3 text-sm font-semibold cursor-pointer transition-colors hover:border-(--color-text-muted) hover:text-(--color-text)"
                      >
                        Planlæg selv
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={enterEditMode}
                      disabled={!expandedSlots || expandedSaving}
                      className="inline-flex items-center gap-1.5 h-8 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3 text-sm font-semibold cursor-pointer transition-colors hover:border-(--color-text-muted) hover:text-(--color-text) disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Pencil size={13} />
                      Rediger
                    </button>
                  )}

                  {/* Shopping list shortcut — right-aligned */}
                  {missingCount > 0 && (
                    <Link
                      href={`/shopping-list?weekStart=${ws}`}
                      className="ml-auto inline-flex items-center gap-1.5 h-8 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3 text-sm font-semibold transition-colors hover:border-(--color-text-muted) hover:text-(--color-text)"
                    >
                      <ShoppingCart size={13} />
                      {missingCount} varer
                    </Link>
                  )}
                </div>

                {/* Day list */}
                {expandedLoading ? (
                  <p className="text-sm text-(--color-text-muted)">Henter…</p>
                ) : expandedSlots ? (
                  <div className={cn(
                    "grid",
                    isEditing ? "grid-cols-[2.5rem_1fr_auto]" : "grid-cols-[2.5rem_1fr]",
                  )}>
                    {expandedSlots.map((slot, i) => {
                      const isLast = i === expandedSlots.length - 1;
                      const rowBorder = isLast ? "" : "border-b border-(--color-border)/50";
                      return (
                        <Fragment key={i}>
                          {/* Day label */}
                          <span
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wide py-2 content-center",
                              rowBorder,
                              slot ? "text-(--color-text-muted)" : "text-(--color-text-muted)/40",
                            )}
                          >
                            {DAGE_SHORT[i]}
                          </span>

                          {/* Recipe or empty */}
                          <div className={cn("flex items-center gap-2 py-2 min-w-0", rowBorder)}>
                            {slot ? (
                              <>
                                {slot.status === "completed" && (
                                  <CheckCircle2 size={13} className="shrink-0 text-(--color-primary)" />
                                )}
                                {slot.status === "cooking" && (
                                  <span className="w-2 h-2 shrink-0 rounded-full bg-(--color-warning)" />
                                )}
                                <span className={cn(
                                  "text-sm truncate",
                                  slot.status === "completed" ? "text-(--color-text-muted) line-through" : "text-(--color-text)",
                                )}>{slot.name}</span>
                              </>
                            ) : isEditing ? (
                              <span className="text-sm italic text-(--color-text-muted)/40 select-none">+ Tilføj opskrift</span>
                            ) : (
                              <span className="text-sm text-(--color-text-muted)/40 select-none">—</span>
                            )}
                          </div>

                          {/* Move + slot controls — edit mode only */}
                          {isEditing && (
                            <div className={cn("flex items-center gap-0.5 py-1 pl-2", rowBorder)}>
                              <button
                                type="button"
                                onClick={() => moveSlot(i, "up")}
                                disabled={i === 0}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  i === 0
                                    ? "text-(--color-border) cursor-not-allowed"
                                    : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) cursor-pointer",
                                )}
                                aria-label="Flyt op"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSlot(i, "down")}
                                disabled={i === expandedSlots.length - 1}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  i === expandedSlots.length - 1
                                    ? "text-(--color-border) cursor-not-allowed"
                                    : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) cursor-pointer",
                                )}
                                aria-label="Flyt ned"
                              >
                                <ChevronDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplaceSlot(i)}
                                className="p-1 rounded transition-colors opacity-60 text-(--color-text-muted) hover:opacity-100 hover:text-(--color-primary) hover:bg-(--color-surface-2) cursor-pointer"
                                aria-label="Skift ret"
                              >
                                <RefreshCw size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(i)}
                                disabled={!slot}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  slot
                                    ? "opacity-60 text-(--color-text-muted) hover:opacity-100 hover:text-(--color-danger) hover:bg-(--color-surface-2) cursor-pointer"
                                    : "text-(--color-border) cursor-not-allowed opacity-30",
                                )}
                                aria-label="Fjern ret"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                ) : null}

                {/* Error */}
                {expandedError && (
                  <p className="text-sm text-(--color-danger) bg-(--color-danger-subtle) border border-(--color-danger) rounded-lg px-3 py-2">
                    {expandedError}
                  </p>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
