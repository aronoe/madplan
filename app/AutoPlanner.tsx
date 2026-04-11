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
} from "@/lib/queries";
import { autoSelectRecipes, type Tempo } from "@/lib/autoSelect";
import type { Recipe } from "@/lib/types";
import { buildSavePlan } from "@/lib/weekPlan";
import ChipSelect from "@/components/ChipSelect";
import WeekPreview from "@/components/WeekPreview";

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
      setError(err instanceof Error ? err.message : "Ukendt fejl ved generering");
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
      setError(err instanceof Error ? err.message : "Ukendt fejl ved generering");
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
      // Clear every day for this week before re-saving so stale entries are removed
      await clearWeekMeals(familyId, weekStart);
      const dayEntries = buildSavePlan(editedPlan);
      for (const { dayOfWeek, recipeId } of dayEntries) {
        await setMeal(familyId, weekStart, dayOfWeek, recipeId);
      }
      router.push("/madplan");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ukendt fejl ved gemning");
      setApproving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20 }}>

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
            <button
              type="button"
              onClick={() => setPreviewPlan(null)}
              style={{ marginTop: 16, background: "none", border: "none", color: "var(--c-text-muted)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
            >
              ← Tilbage til indstillinger
            </button>
            {error && (
              <div style={{ marginTop: 12, background: "#fff0f0", border: "1.5px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", color: "#c0392b", fontSize: 14, maxWidth: 480, width: "100%" }}>
                {error}
              </div>
            )}
          </>
        ) : (
          /* Input step */
          <div style={{ background: "var(--c-card-bg)", borderRadius: 20, boxShadow: "0 2px 16px rgba(0,80,40,.10)", padding: "40px 36px", width: "100%", maxWidth: 480 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--c-text-dark)", marginBottom: 8 }}>
              🗓️ Planlæg din uge
            </h1>
            <p style={{ fontSize: 15, color: "var(--c-text-mid)", marginBottom: 32 }}>
              Fortæl os hvad der er på tilbud, så vælger vi opskrifterne.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Preset quick-chips */}
              <div>
                <label style={labelStyle}>Hvad er på tilbud denne uge?</label>
                <ChipSelect
                  options={PRESET_INGREDIENTS}
                  selected={selectedIngredients}
                  onChange={setSelectedIngredients}
                />
              </div>

              {/* Search + custom chips */}
              <div>
                <label style={labelStyle}>Eller søg efter ingrediens</label>
                {/* Combined chip+input box */}
                <div
                  style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 10, border: "1.5px solid var(--c-border)", background: "var(--c-input-bg)", cursor: "text", minHeight: 46 }}
                  onClick={() => inputRef.current?.focus()}
                >
                  {/* Show chips for non-preset selections */}
                  {selectedIngredients
                    .filter((ing) => !PRESET_INGREDIENTS.includes(ing))
                    .map((ing) => (
                      <span
                        key={ing}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e8f8ef", color: "#1a5c35", border: "1.5px solid #4caf82", borderRadius: 20, padding: "3px 10px 3px 12px", fontSize: 13, fontWeight: 600 }}
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeIngredient(ing); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#4caf82", fontSize: 14, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}
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
                    style={{ flex: 1, minWidth: 120, border: "none", outline: "none", background: "transparent", color: "var(--c-text-dark)", fontSize: 15, padding: "2px 4px" }}
                  />
                </div>
                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    style={{ background: "var(--c-card-bg)", border: "1.5px solid var(--c-border)", borderRadius: 10, marginTop: 4, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,80,40,.12)" }}
                  >
                    {suggestions.map((name, i) => (
                      <div
                        key={name}
                        onPointerDown={(e) => { e.preventDefault(); addIngredient(name); }}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "var(--c-text-dark)", borderBottom: i < suggestions.length - 1 ? "1px solid var(--c-border)" : "none" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--c-active-bg)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tempo */}
              <div>
                <label style={labelStyle}>Tempo</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {TEMPO_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", borderRadius: 10, border: tempo === value ? "2px solid #4caf82" : "1.5px solid var(--c-border)", background: tempo === value ? "var(--c-active-bg)" : "var(--c-input-bg)", transition: "border-color 0.15s" }}
                    >
                      <input
                        type="radio"
                        name="tempo"
                        value={value}
                        checked={tempo === value}
                        onChange={() => setTempo(value)}
                        style={{ accentColor: "#4caf82", width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text-dark)" }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Days selector */}
              <div>
                <label style={labelStyle}>Antal dage</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: days === d ? "2px solid #4caf82" : "1.5px solid var(--c-border)", background: days === d ? "#4caf82" : "var(--c-input-bg)", color: days === d ? "white" : "var(--c-text-mid)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ background: "#fff0f0", border: "1.5px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", color: "#c0392b", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                style={{ background: generating ? "var(--c-border)" : "#4caf82", color: "white", border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 800, fontSize: 16, cursor: generating ? "not-allowed" : "pointer", width: "100%" }}
              >
                {generating ? "Finder opskrifter…" : "Planlæg min uge"}
              </button>
            </form>
          </div>
        )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--c-text-mid)",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

