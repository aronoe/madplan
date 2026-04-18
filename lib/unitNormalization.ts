/**
 * Unit normalization and aggregation for grouped shopping list items.
 *
 * Supported conversions (exact):
 *   weight : g ↔ kg           (base: g)
 *   volume : ml ↔ cl ↔ dl ↔ l (base: ml)
 *   spoon  : tsk ↔ spsk       (base: tsk,  1 spsk = 3 tsk)
 *
 * When categories are incompatible (e.g. weight + spoon), we use the
 * dominant category and prefix the result with "~" to signal approximation.
 *
 * Priority: weight > volume > spoon > count
 *
 * Per-ingredient preferred display units can be configured in PREFERRED_UNITS.
 * When a preference is set and compatible with the computed category, the total
 * is expressed in that unit instead of the magnitude-based default.
 */

type UnitCategory = "weight" | "volume" | "spoon";

interface UnitInfo {
  category: UnitCategory;
  /** Multiply the entry's amount by this to reach the category's base unit. */
  factor: number;
}

const UNIT_INFO: Record<string, UnitInfo> = {
  // weight (base: g)
  g:    { category: "weight", factor: 1 },
  kg:   { category: "weight", factor: 1000 },
  // volume (base: ml)
  ml:   { category: "volume", factor: 1 },
  cl:   { category: "volume", factor: 10 },
  dl:   { category: "volume", factor: 100 },
  l:    { category: "volume", factor: 1000 },
  // spoon (base: tsk)
  tsk:  { category: "spoon", factor: 1 },
  spsk: { category: "spoon", factor: 3 },
};

/**
 * Per-ingredient preferred display units.
 * Keys are lower-cased ingredient names; values are a unit string from UNIT_INFO.
 * When the computed total is in the same category as the preferred unit, the
 * total is expressed in the preferred unit instead of the magnitude default.
 *
 * Add entries here as needed — no DB migration required.
 */
const PREFERRED_UNITS: Record<string, string> = {
  // flour / dry goods → always grams, not kg
  mel:              "g",
  hvedemel:         "g",
  rugmel:           "g",
  kartofler:        "g",
  // liquid fats and acids → ml, not dl
  olie:             "ml",
  olivenolie:       "ml",
  rapsolie:         "ml",
  solsikkeolie:     "ml",
  æblecidereddike:  "ml",
  hvidvinseddike:   "ml",
  rødvinseddike:    "ml",
  // spices → tsk, not spsk
  spidskommen:      "tsk",
  paprika:          "tsk",
  kanel:            "tsk",
  gurkemeje:        "tsk",
  oregano:          "tsk",
  timian:           "tsk",
  // count — documented for clarity; count aggregation handles these independently
  løg:              "stk",
  rødløg:           "stk",
  skalotteløg:      "stk",
  hvidløg:          "fed",
};

/** Category priority used when picking the dominant unit for mixed groups. */
const CATEGORY_PRIORITY: UnitCategory[] = ["weight", "volume", "spoon"];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n % 1 === 0) return String(n);
  return n.toFixed(1).replace(/\.0$/, "");
}

function formatByCategory(base: number, category: UnitCategory): string {
  switch (category) {
    case "weight":
      return base >= 500 ? `${fmt(base / 1000)} kg` : `${fmt(base)} g`;
    case "volume":
      if (base >= 500) return `${fmt(base / 1000)} l`;
      if (base >= 50)  return `${fmt(base / 100)} dl`;
      return `${fmt(base)} ml`;
    case "spoon":
      return base >= 3 ? `${fmt(base / 3)} spsk` : `${fmt(base)} tsk`;
  }
}

/**
 * If `ingredientName` has a preferred unit that belongs to the same category
 * as `computedCategory`, return the total expressed in the preferred unit.
 * Returns null when no preference applies or units are incompatible.
 */
function applyPreferredUnit(
  totalBase: number,
  computedCategory: UnitCategory,
  ingredientName: string,
): string | null {
  const prefUnit = PREFERRED_UNITS[ingredientName.toLowerCase().trim()];
  if (!prefUnit) return null;
  const prefInfo = UNIT_INFO[prefUnit.toLowerCase()];
  if (!prefInfo || prefInfo.category !== computedCategory) return null;
  // Convert from category base → preferred unit
  const amount = totalBase / prefInfo.factor;
  return `${fmt(amount)} ${prefUnit}`;
}

// ── Internal entry types ──────────────────────────────────────────────────────

type KnownEntry = { kind: "known"; category: UnitCategory; base: number };
type CountEntry = { kind: "count"; unit: string; amount: number };
type MappedEntry = KnownEntry | CountEntry;

function mapEntry(e: { amount: number; unit: string }): MappedEntry {
  const info = UNIT_INFO[e.unit.toLowerCase().trim()];
  return info
    ? { kind: "known", category: info.category, base: e.amount * info.factor }
    : { kind: "count", unit: e.unit, amount: e.amount };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AggregateResult {
  /**
   * Always a meaningful display string — never "N linjer".
   * May be prefixed with "~" when the result is an approximation
   * (some entries were dropped in favour of the dominant unit).
   */
  display: string;
  /** True = exact sum; false = approximated via dominant-unit logic. */
  exact: boolean;
}

/**
 * Aggregate amounts from multiple entries of the same grouped ingredient.
 *
 * Pass `ingredientName` to enable preferred-unit formatting (e.g. "Mel" → g).
 *
 * Cases, in order:
 * 1. Single entry                          → format, apply preferred unit if set
 * 2. All same unit                         → exact sum, apply preferred unit if set
 * 3. All same category (compatible)        → exact sum, apply preferred unit if set
 * 4. Mixed known categories or known+count → dominant category wins, prefix "~"
 * 5. All count, same unit                  → exact sum
 * 6. All count, different units            → joined string ("2 stk + 3 fed")
 */
export function aggregateGroupAmount(
  entries: ReadonlyArray<{ amount: number; unit: string }>,
  ingredientName = "",
): AggregateResult {
  if (entries.length === 0) return { display: "", exact: true };

  if (entries.length === 1) {
    const { amount, unit } = entries[0];
    const info = UNIT_INFO[unit.toLowerCase().trim()];
    if (info) {
      const base = amount * info.factor;
      const display =
        applyPreferredUnit(base, info.category, ingredientName) ??
        formatByCategory(base, info.category);
      return { display, exact: true };
    }
    return { display: `${fmt(amount)} ${unit}`, exact: true };
  }

  const mapped = entries.map(mapEntry);
  const known = mapped.filter((m): m is KnownEntry => m.kind === "known");
  const counts = mapped.filter((m): m is CountEntry => m.kind === "count");

  // ── All entries have known convertible units ──────────────────────────────
  if (counts.length === 0) {
    const categories = new Set(known.map((e) => e.category));

    // Same category → exact sum, apply preferred unit if available
    if (categories.size === 1) {
      const category = known[0].category;
      const totalBase = known.reduce((s, e) => s + e.base, 0);
      const display =
        applyPreferredUnit(totalBase, category, ingredientName) ??
        formatByCategory(totalBase, category);
      return { display, exact: true };
    }

    // Mixed categories → dominant unit wins, drop the rest
    for (const dominant of CATEGORY_PRIORITY) {
      if (categories.has(dominant)) {
        const dominantEntries = known.filter((e) => e.category === dominant);
        const totalBase = dominantEntries.reduce((s, e) => s + e.base, 0);
        const inner =
          applyPreferredUnit(totalBase, dominant, ingredientName) ??
          formatByCategory(totalBase, dominant);
        return { display: inner, exact: false };
      }
    }
  }

  // ── All entries are count units ───────────────────────────────────────────
  if (known.length === 0) {
    const units = new Set(counts.map((e) => e.unit.toLowerCase().trim()));
    if (units.size === 1) {
      const total = counts.reduce((s, e) => s + e.amount, 0);
      return { display: `${fmt(total)} ${counts[0].unit}`, exact: true };
    }
    return {
      display: entries.map((e) => `${fmt(e.amount)} ${e.unit}`).join(" + "),
      exact: false,
    };
  }

  // ── Mixed: some known, some count → dominant known category wins ──────────
  const knownCategories = new Set(known.map((e) => e.category));
  for (const dominant of CATEGORY_PRIORITY) {
    if (knownCategories.has(dominant)) {
      const dominantEntries = known.filter((e) => e.category === dominant);
      const totalBase = dominantEntries.reduce((s, e) => s + e.base, 0);
      const inner =
        applyPreferredUnit(totalBase, dominant, ingredientName) ??
        formatByCategory(totalBase, dominant);
      return { display: inner, exact: false };
    }
  }

  // Unreachable, but satisfy TypeScript
  return {
    display: entries.map((e) => `${fmt(e.amount)} ${e.unit}`).join(" + "),
    exact: false,
  };
}
