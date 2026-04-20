"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getRecipes,
  getRecipesWithIngredient,
  getMealPlan,
  setMeal,
  clearWeekMeals,
  getWeekStart,
  addWeeks,
  searchIngredients,
  updateRecipe,
} from "@/lib/queries";
import { autoSelectRecipes, type Tempo } from "@/lib/autoSelect";
import { invalidateCurrentWeekBadge } from "@/lib/shoppingBadgeStore";
import type { Recipe } from "@/lib/types";
import { buildSavePlan } from "@/lib/weekPlan";
import ChipSelect from "@/components/ChipSelect";
import WeekPreview from "@/components/WeekPreview";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { cn } from "@/lib/cn";
import { Zap, Shuffle, Coffee, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

const PRESET_INGREDIENTS = ["Kylling", "Oksekød", "Laks", "Vegetar", "Pasta"];

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

type TempoOption = { value: Tempo; label: string; sub: string; Icon: LucideIcon };
const TEMPO_OPTIONS: TempoOption[] = [
  { value: "hurtig", label: "Hurtigt",       sub: "Under 30 min",    Icon: Zap },
  { value: "mix",    label: "Mix",            sub: "Varieret uge",    Icon: Shuffle },
  { value: "weekend",label: "Weekend",        sub: "Mere tid i køkken", Icon: Coffee },
];

const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)";

export default function AutoPlanner({ familyId }: { familyId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Week picker state ──────────────────────────────────────────────────────
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const param = searchParams.get("week");
    // Validate: must be a YYYY-MM-DD Monday — if invalid fall back to current week
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return param;
    return getWeekStart(0);
  });

  // ── Ingredient picker state ────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [days, setDays] = useState(5);
  const [tempo, setTempo] = useState<Tempo>("mix");
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewPlan, setPreviewPlan] = useState<Recipe[] | null>(null);
  const [planVersion, setPlanVersion] = useState(0);
  const [cachedRecipes, setCachedRecipes] = useState<Recipe[]>([]);
  const [planWarning, setPlanWarning] = useState<string | null>(null);

  // Fetch suggestions while typing
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    let cancelled = false;
    searchIngredients(familyId, inputValue)
      .then((names) => {
        if (cancelled) return;
        const filtered = names.filter(
          (n) => !selectedIngredients.some((s) => s.toLowerCase() === n.toLowerCase()),
        );
        setSuggestions(filtered);
        setDropdownOpen(filtered.length > 0);
      })
      .catch(() => {/* silently ignore */});
    return () => { cancelled = true; };
  }, [inputValue, familyId, selectedIngredients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function addIngredient(name: string) {
    if (!selectedIngredients.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setSelectedIngredients((prev) => [...prev, name]);
    }
    setInputValue("");
    setSuggestions([]);
    setDropdownOpen(false);
    inputRef.current?.focus();
  }

  function removeIngredient(name: string) {
    setSelectedIngredients((prev) => prev.filter((s) => s !== name));
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addIngredient(suggestions.length > 0 ? suggestions[0] : inputValue.trim());
      }
    } else if (e.key === "Backspace" && inputValue === "" && selectedIngredients.length > 0) {
      removeIngredient(selectedIngredients[selectedIngredients.length - 1]);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  // ── Generate plan (without saving) ────────────────────────────────────────
  async function generatePlan(): Promise<Recipe[]> {
    const [proteinMatches, all] = await Promise.all([
      selectedIngredients.length > 0
        ? getRecipesWithIngredient(familyId, selectedIngredients)
        : Promise.resolve([]),
      getRecipes(familyId),
    ]);
    const allTyped = all as Recipe[];
    setCachedRecipes(allTyped);
    const plan = autoSelectRecipes(proteinMatches, allTyped, days, tempo);
    setPlanWarning(
      plan.length < days && allTyped.length > 0
        ? `Vi kunne kun finde ${plan.length} passende ${plan.length === 1 ? "ret" : "retter"} ud fra dine valg.`
        : null,
    );
    return plan;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      const plan = await generatePlan();
      if (plan.length === 0) {
        setError("Ingen opskrifter fundet. Tilføj opskrifter under Opskrifter.");
        return;
      }
      setPreviewPlan(plan);
      setPlanVersion((v) => v + 1);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke generere ugeplanen. Tjek din forbindelse og prøv igen.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setError(null);
    setGenerating(true);
    try {
      const plan = await generatePlan();
      if (plan.length > 0) {
        setPreviewPlan(plan);
        setPlanVersion((v) => v + 1);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke regenerere ugeplanen. Prøv igen.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(editedPlan: (Recipe | null)[]) {
    setApproving(true);
    try {
      const existingPlan = await getMealPlan(familyId, selectedWeekStart);
      if ((existingPlan ?? []).length > 0) {
        const ok = confirm("Ugen har allerede retter planlagt. Vil du overskrive dem?");
        if (!ok) { setApproving(false); return; }
      }
      if (selectedIngredients.length > 0) {
        localStorage.setItem("offerIngredients", JSON.stringify(selectedIngredients));
      } else {
        localStorage.removeItem("offerIngredients");
      }
      await clearWeekMeals(familyId, selectedWeekStart);
      const dayEntries = buildSavePlan(editedPlan);
      for (const { dayOfWeek, recipeId } of dayEntries) {
        await setMeal(familyId, selectedWeekStart, dayOfWeek, recipeId);
      }
      // Reset queue_for_next_plan on recipes that were queued and used in this plan
      const queuedUsed = (editedPlan.filter(Boolean) as Recipe[]).filter(
        (r) => r.queue_for_next_plan,
      );
      await Promise.all(
        queuedUsed.map((r) =>
          updateRecipe(r.id, { queue_for_next_plan: false, queue_order: null }),
        ),
      );
      if (selectedWeekStart === getWeekStart(0)) invalidateCurrentWeekBadge();
      router.push(`/madplan?week=${selectedWeekStart}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke gemme ugeplanen. Tjek din forbindelse og prøv igen.",
      );
      setApproving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">

      {previewPlan ? (
        /* ── Preview step ─────────────────────────────────────────────────── */
        <>
          <WeekPreview
            key={planVersion}
            plan={previewPlan}
            allRecipes={cachedRecipes}
            selectedIngredients={selectedIngredients}
            tempo={tempo}
            warning={planWarning}
            loading={approving || generating}
            onRegenerate={handleRegenerate}
            onApprove={handleApprove}
          />
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreviewPlan(null)}
            >
              ← Tilbage til indstillinger
            </Button>
          </div>
          {error && <ErrorBanner message={error} />}
        </>
      ) : (
        /* ── Input step ───────────────────────────────────────────────────── */
        <>
          <div>
            <SectionHeader level={1}>Planlæg din uge</SectionHeader>
            <p className="mt-1.5 text-[15px] text-(--color-text-mid)">
              Fortæl os hvad der er på tilbud, og vi vælger opskrifterne.
            </p>
          </div>

          {/* ── Week picker ─────────────────────────────────────────────── */}
          {(() => {
            const monday = new Date(selectedWeekStart.replace(/-/g, "/"));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const fmt = (d: Date) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
            const isCurrentWeek = selectedWeekStart === getWeekStart(0);
            return (
              <div className="flex items-center gap-2 justify-between bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart((w) => addWeeks(w, -1))}
                  className="inline-flex items-center gap-1 text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) cursor-pointer transition-colors"
                >
                  <ChevronLeft size={16} />
                  Forrige
                </button>
                <div className="text-center">
                  <div className="text-sm font-bold text-(--color-text)">
                    Uge {getISOWeek(monday)}
                    {isCurrentWeek && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide bg-(--color-primary)/15 text-(--color-primary) rounded-full px-1.5 py-0.5">
                        Denne uge
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-(--color-text-muted)">{fmt(monday)} – {fmt(sunday)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart((w) => addWeeks(w, 1))}
                  className="inline-flex items-center gap-1 text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) cursor-pointer transition-colors"
                >
                  Næste
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })()}

          <Card padding="lg">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              {/* ── Ingredients ─────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <span className={sectionLabelClass}>Hvad er på tilbud?</span>
                <ChipSelect
                  options={PRESET_INGREDIENTS}
                  selected={selectedIngredients}
                  onChange={setSelectedIngredients}
                />
                {/* Search + custom chips */}
                <div className="relative">
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded-lg border",
                      "border-(--color-border) bg-(--color-bg) cursor-text min-h-10",
                      "focus-within:border-(--color-border-focus) focus-within:ring-1 focus-within:ring-(--color-border-focus)",
                      "transition-colors",
                    )}
                    onClick={() => inputRef.current?.focus()}
                  >
                    {selectedIngredients
                      .filter((ing) => !PRESET_INGREDIENTS.includes(ing))
                      .map((ing) => (
                        <span
                          key={ing}
                          className="inline-flex items-center gap-1 bg-(--color-primary-subtle) text-(--color-primary-text) border border-(--color-primary) rounded-full py-0.5 pl-2.5 pr-1.5 text-xs font-semibold"
                        >
                          {ing}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeIngredient(ing); }}
                            className="bg-transparent border-none cursor-pointer text-(--color-primary) leading-none p-0 flex items-center opacity-70 hover:opacity-100"
                            aria-label={`Fjern ${ing}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onFocus={() => { if (suggestions.length > 0) setDropdownOpen(true); }}
                      placeholder={selectedIngredients.filter(i => !PRESET_INGREDIENTS.includes(i)).length === 0 ? "Søg ingrediens…" : ""}
                      className="flex-1 min-w-24 border-none outline-none bg-transparent text-(--color-text) text-sm px-1 py-0.5 placeholder:text-(--color-text-muted)"
                    />
                  </div>
                  {dropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 right-0 top-full mt-1 bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden shadow-md z-10"
                    >
                      {suggestions.map((name, i) => (
                        <div
                          key={name}
                          onPointerDown={(e) => { e.preventDefault(); addIngredient(name); }}
                          className={cn(
                            "px-3.5 py-2.5 cursor-pointer text-sm text-(--color-text) hover:bg-(--color-active-bg) transition-colors",
                            i < suggestions.length - 1 && "border-b border-(--color-border)",
                          )}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-(--color-border)" />

              {/* ── Tempo ───────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <span className={sectionLabelClass}>Tempo</span>
                <div className="flex flex-col gap-2">
                  {TEMPO_OPTIONS.map(({ value, label, sub, Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer px-3.5 py-2.5 rounded-xl border transition-colors",
                        tempo === value
                          ? "border-(--color-primary) bg-(--color-active-bg)"
                          : "border-(--color-border) bg-(--color-bg) hover:border-(--color-primary)",
                      )}
                    >
                      <input
                        type="radio"
                        name="tempo"
                        value={value}
                        checked={tempo === value}
                        onChange={() => setTempo(value)}
                        className="sr-only"
                      />
                      <Icon
                        size={16}
                        className={cn(
                          "shrink-0",
                          tempo === value ? "text-(--color-primary)" : "text-(--color-text-muted)",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-(--color-text)">{label}</span>
                        <span className="ml-2 text-xs text-(--color-text-muted)">{sub}</span>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                        tempo === value
                          ? "border-(--color-primary) bg-(--color-primary)"
                          : "border-(--color-border)",
                      )}>
                        {tempo === value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-(--color-border)" />

              {/* ── Days ────────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className={sectionLabelClass}>Antal dage</span>
                  <span className="text-sm font-semibold text-(--color-text)">{days} {days === 1 ? "dag" : "dage"}</span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={cn(
                        "flex-1 py-2 rounded-lg border font-bold text-sm transition-colors",
                        days === d
                          ? "border-(--color-primary) bg-(--color-primary) text-white"
                          : "border-(--color-border) bg-(--color-bg) text-(--color-text-mid) hover:border-(--color-primary) hover:text-(--color-primary)",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {error && <ErrorBanner message={error} />}

              <Button type="submit" variant="primary" size="lg" fullWidth disabled={generating}>
                {generating ? "Finder opskrifter…" : "Planlæg min uge"}
              </Button>

            </form>
          </Card>
        </>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-(--color-danger-subtle) border border-(--color-danger) rounded-xl p-3 text-sm text-(--color-danger)">
      {message}
    </div>
  );
}
