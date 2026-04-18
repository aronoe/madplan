"use client";

import { useEffect, useState } from "react";
import {
  getMealPlanSummaries,
  getMealPlan,
  getRecipes,
  setMeal,
  clearWeekMeals,
  updateRecipe,
  getWeekStart,
  addWeeks,
} from "@/lib/queries";
import { autoSelectRecipes } from "@/lib/autoSelect";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Fragment } from "react";
import { ChevronDown, ChevronUp, Zap, Trash2, Pencil, Check, X } from "lucide-react";

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

const STATUS_STYLES: Record<Status, { label: string; chip: string }> = {
  planned: { label: "Planlagt",  chip: "bg-green-100 text-green-700" },
  partial: { label: "Delvist",   chip: "bg-amber-100 text-amber-700" },
  empty:   { label: "Uplanlagt", chip: "bg-(--color-surface-2) text-(--color-text-muted)" },
};

interface DaySlot {
  recipeId: string;
  name: string;
  emoji: string;
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

  const [summaries, setSummaries] = useState<Record<string, number>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<(DaySlot | null)[] | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedSaving, setExpandedSaving] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [originalSlots, setOriginalSlots] = useState<(DaySlot | null)[] | null>(null);

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
      return;
    }

    setExpandedWeek(ws);
    setExpandedSlots(null);
    setExpandedError(null);
    setIsEditing(false);
    setOriginalSlots(null);
    setExpandedLoading(true);

    getMealPlan(familyId, ws)
      .then((data) => {
        const grid = Array(7).fill(null) as (DaySlot | null)[];
        for (const entry of (data ?? []) as Array<{
          day_of_week: number;
          recipe_id: string;
          recipe: { name: string; emoji: string } | null;
        }>) {
          if (entry.day_of_week >= 0 && entry.day_of_week < 7) {
            grid[entry.day_of_week] = {
              recipeId: entry.recipe_id,
              name: entry.recipe?.name ?? "Ukendt ret",
              emoji: entry.recipe?.emoji ?? "🍽️",
            };
          }
        }
        setExpandedSlots(grid);
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
      const newCount = expandedSlots.filter(Boolean).length;
      setSummaries((prev) => ({ ...prev, [ws]: newCount }));
      setOriginalSlots(null);
      setIsEditing(false);
    } catch {
      setExpandedError("Kunne ikke gemme ændringer.");
    } finally {
      setExpandedSaving(false);
    }
  }

  // ── Autoplan ──────────────────────────────────────────────────────────────

  async function handleAutoplan(ws: string) {
    const current = summaries[ws] ?? 0;
    if (current > 0 && !confirm("Ugen har allerede retter planlagt. Vil du erstatte dem?")) return;

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
        newGrid[i] = { recipeId: plan[i].id, name: plan[i].name, emoji: plan[i].emoji };
      }
      setExpandedSlots(newGrid);
      setSummaries((prev) => ({ ...prev, [ws]: plan.length }));
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
      setSummaries((prev) => ({ ...prev, [ws]: 0 }));
      setIsEditing(false);
      setOriginalSlots(null);
    } catch {
      setExpandedError("Kunne ikke nulstille ugen.");
    } finally {
      setExpandedSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {weekStarts.map((ws) => {
        const monday = new Date(ws.replace(/-/g, "/"));
        const weekNum = getISOWeek(monday);
        const count = summaries[ws] ?? 0;
        const status = loadingSummaries ? "empty" : getStatus(count);
        const { label, chip } = STATUS_STYLES[status];
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
            <button
              type="button"
              onClick={() => toggleWeek(ws)}
              className="flex items-center gap-3 px-4 py-3.5 w-full text-left cursor-pointer hover:bg-(--color-surface-2) transition-colors"
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
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full hidden sm:inline",
                    chip,
                  )}
                >
                  {label}
                </span>
                <span className="text-xs tabular-nums text-(--color-text-muted) w-9 text-right">
                  {loadingSummaries ? "…" : `${count}/7`}
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-(--color-text-muted) transition-transform duration-200 shrink-0",
                    isExpanded && "rotate-180",
                  )}
                />
              </div>
            </button>

            {/* ── Expanded section ── */}
            {isExpanded && (
              <div className="border-t border-(--color-border) bg-(--color-bg) px-5 pt-4 pb-5 flex flex-col gap-4">

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
                                <span className="text-sm leading-none shrink-0">{slot.emoji}</span>
                                <span className="text-sm text-(--color-text) truncate">{slot.name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-(--color-text-muted)/40 select-none">—</span>
                            )}
                          </div>

                          {/* Move controls — edit mode only */}
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

                {/* Action bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-(--color-border)">
                  {isEditing ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSave(ws)}
                          disabled={expandedSaving}
                          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check size={13} />
                          {expandedSaving ? "Gemmer…" : "Gem"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={expandedSaving}
                          className="inline-flex items-center gap-1.5 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:border-(--color-text-muted) hover:text-(--color-text) disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <X size={13} />
                          Annuller
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReset(ws)}
                          disabled={expandedSaving || (expandedSlots?.every((s) => s === null) ?? true)}
                          className="inline-flex items-center gap-1.5 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:border-(--color-danger) hover:text-(--color-danger) disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={13} />
                          Nulstil
                        </button>
                      </div>
                      <span className="ml-auto text-xs font-medium text-(--color-text-muted) bg-(--color-surface-2) px-2 py-0.5 rounded-full">
                        Redigering
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      {count < 7 && (
                        <button
                          type="button"
                          onClick={() => handleAutoplan(ws)}
                          disabled={expandedSaving}
                          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Zap size={13} />
                          {expandedSaving ? "Arbejder…" : "Planlæg uge automatisk"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={enterEditMode}
                        disabled={expandedSaving || !expandedSlots}
                        className="inline-flex items-center gap-1.5 border border-(--color-border) text-(--color-text-muted) rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:border-(--color-text-muted) hover:text-(--color-text) disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil size={13} />
                        Rediger
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
