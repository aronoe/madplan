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
  searchIngredients,
  updateRecipe,
} from "@/lib/queries";
import { autoSelectRecipes, type Tempo } from "@/lib/autoSelect";
import { invalidateCurrentWeekBadge } from "@/lib/shoppingBadgeStore";
import type { Recipe } from "@/lib/types";
import { buildSavePlan } from "@/lib/weekPlan";
import ChipSelect from "@/components/ChipSelect";
import WeekPreview from "@/components/WeekPreview";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";

const PRESET_INGREDIENTS = ["Kylling", "Oksekød", "Laks", "Vegetar", "Pasta"];

const TEMPO_OPTIONS: { value: Tempo; label: string }[] = [
  { value: "hurtig", label: "⚡ Hurtigt (<30 min)" },
  { value: "mix", label: "🔀 Mix" },
  { value: "weekend", label: "🍷 Weekend hygge" },
];

export default function AutoPlanner({ familyId }: { familyId: string }) {
  const router = useRouter();

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
  // All recipes cached after first generate — passed to WeekPreview for per-day swaps
  const [cachedRecipes, setCachedRecipes] = useState<Recipe[]>([]);
  // Soft warning shown in preview when fewer recipes found than days requested
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
    // Soft warning when we got fewer than requested
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
      setPlanVersion((v) => v + 1); // forces WeekPreview remount with fresh state
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

  // ── Approve: save the (possibly edited) plan to DB and redirect ────────────
  // editedPlan is a sparse array: index = day_of_week (0=Mandag … 6=Søndag), null = skipped.
  // We clear the whole week first so removed days don't linger from a previous save.
  async function handleApprove(editedPlan: (Recipe | null)[]) {
    setApproving(true);
    try {
      const weekStart = getWeekStart(0);
      const existingPlan = await getMealPlan(familyId, weekStart);
      if ((existingPlan ?? []).length > 0) {
        const ok = confirm("Ugen har allerede retter planlagt. Vil du overskrive dem?");
        if (!ok) { setApproving(false); return; }
      }
      if (selectedIngredients.length > 0) {
        localStorage.setItem("offerIngredients", JSON.stringify(selectedIngredients));
      } else {
        localStorage.removeItem("offerIngredients");
      }
      await clearWeekMeals(familyId, weekStart);
      const dayEntries = buildSavePlan(editedPlan);
      for (const { dayOfWeek, recipeId } of dayEntries) {
        await setMeal(familyId, weekStart, dayOfWeek, recipeId);
      }
      // Reset queue flags for queued recipes that were used in the plan
      const queuedUsed = (editedPlan.filter(Boolean) as Recipe[]).filter(
        (r) => r.queue_for_next_plan,
      );
      await Promise.all(
        queuedUsed.map((r) =>
          updateRecipe(r.id, { queue_for_next_plan: false, queue_order: null }),
        ),
      );
      invalidateCurrentWeekBadge();
      router.push("/madplan");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke gemme ugeplanen. Tjek din forbindelse og prøv igen.",
      );
      setApproving(false);
    }
  }

  return (
    <div className="flex flex-col items-center pt-5">

      {/* Preview step — shown after generating */}
      {previewPlan ? (
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPreviewPlan(null)}
            className="mt-4 underline"
          >
            ← Tilbage til indstillinger
          </Button>
          {error && (
            <div className="mt-3 bg-(--color-danger-subtle) border border-(--color-danger) rounded-xl p-3 text-sm text-(--color-danger) max-w-lg w-full">
              {error}
            </div>
          )}
        </>
      ) : (
        /* Input step */
        <div className="bg-(--color-surface) rounded-2xl shadow-sm border border-(--color-border) p-6 w-full max-w-lg mx-auto">
          <h1 className="text-2xl font-extrabold text-(--color-text) mb-2">
            🗓️ Planlæg din uge
          </h1>
          <p className="text-[15px] text-(--color-text-mid) mb-8">
            Fortæl os hvad der er på tilbud, så vælger vi opskrifterne.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* Preset quick-chips */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-2">
                Hvad er på tilbud denne uge?
              </label>
              <ChipSelect
                options={PRESET_INGREDIENTS}
                selected={selectedIngredients}
                onChange={setSelectedIngredients}
              />
            </div>

            {/* Search + custom chips */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-2">
                Eller søg efter ingrediens
              </label>
              {/* Combined chip+input box */}
              <div
                className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded-xl border border-(--color-border) bg-(--color-bg) cursor-text min-h-11.5"
                onClick={() => inputRef.current?.focus()}
              >
                {/* Show chips for non-preset selections */}
                {selectedIngredients
                  .filter((ing) => !PRESET_INGREDIENTS.includes(ing))
                  .map((ing) => (
                    <span
                      key={ing}
                      className="inline-flex items-center gap-1 bg-(--color-primary-subtle) text-(--color-primary-text) border border-(--color-primary) rounded-full py-0.5 pl-3 pr-2 text-[13px] font-semibold"
                    >
                      {ing}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeIngredient(ing); }}
                        className="bg-transparent border-none cursor-pointer text-(--color-primary) text-sm leading-none p-0 flex items-center"
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
                  placeholder="f.eks. svinefilet, ris…"
                  className="flex-1 min-w-30 border-none outline-none bg-transparent text-(--color-text) text-[15px] px-1 py-0.5"
                />
              </div>
              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="bg-(--color-surface) border border-(--color-border) rounded-xl mt-1 overflow-hidden shadow-md"
                >
                  {suggestions.map((name, i) => (
                    <div
                      key={name}
                      onPointerDown={(e) => { e.preventDefault(); addIngredient(name); }}
                      className={cn(
                        "px-3.5 py-2.5 cursor-pointer text-sm text-(--color-text) hover:bg-(--color-active-bg) transition-colors",
                        i < suggestions.length - 1 && "border-b border-(--color-border)"
                      )}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tempo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-2">
                Tempo
              </label>
              <div className="flex flex-col gap-2">
                {TEMPO_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={cn(
                      "flex items-center gap-2.5 cursor-pointer px-3.5 py-2.5 rounded-xl border transition-colors",
                      tempo === value
                        ? "border-(--color-primary) bg-(--color-active-bg)"
                        : "border-(--color-border) bg-(--color-bg) hover:border-(--color-primary)"
                    )}
                  >
                    <input
                      type="radio"
                      name="tempo"
                      value={value}
                      checked={tempo === value}
                      onChange={() => setTempo(value)}
                      className="accent-(--color-primary) w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-(--color-text)">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Days selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-2">
                Antal dage
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg border font-bold text-sm transition-colors",
                      days === d
                        ? "border-(--color-primary) bg-(--color-primary) text-white"
                        : "border-(--color-border) bg-(--color-bg) text-(--color-text-mid) hover:border-(--color-primary)"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-(--color-danger-subtle) border border-(--color-danger) rounded-xl p-3 text-sm text-(--color-danger)">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={generating}>
              {generating ? "Finder opskrifter…" : "Planlæg min uge"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
