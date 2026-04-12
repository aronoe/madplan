# Madplan Stabilization & Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix known edge-case bugs, add tests for all core business logic, and improve error/loading/empty handling across the app — without adding new features.

**Architecture:** Pure business logic is extracted into testable modules (`lib/ingredientUtils.ts`, `lib/weekPlan.ts`). The existing three-layer structure (page → client component → lib) is preserved. Vitest is the test runner; tests live under `__tests__/lib/`.

**Tech Stack:** Next.js 16 (App Router), Supabase, TypeScript, Vitest (new), React 19

---

## Bugs Identified

Before the tasks: here are the four confirmed bugs this plan fixes.

| # | File | Bug |
|---|------|-----|
| B1 | `lib/queries.ts` `getWeekStart` | Uses `.toISOString()` to format date, which converts to UTC first. In UTC+1/+2 (Denmark) a Monday at midnight local time returns the Sunday string. |
| B2 | `components/WeekPreview.tsx` | After `onRegenerate`, the new `plan` prop is ignored — `editPlan` was initialized once from the original `plan` and never resets. |
| B3 | `components/WeekPreview.tsx` | The 🔄 button on an empty slot calls `addSlot()`, which fills the *first* null slot rather than the clicked slot. |
| B4 | `components/MadplanUge.tsx` | The `useEffect` data fetch has no `.catch()` — any of the three parallel Supabase calls silently fails and leaves the user staring at an empty week. |

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `vitest.config.ts` | Test runner config with `@/` alias and TZ |
| Modify | `package.json` | Add `vitest` dev dependency + `test` script |
| Modify | `lib/queries.ts` | Fix `getWeekStart` timezone bug |
| Create | `lib/ingredientUtils.ts` | Pure `aggregateIngredients` function (extracted from queries.ts) |
| Create | `lib/weekPlan.ts` | Pure `buildSavePlan` helper (extracted from AutoPlanner) |
| Modify | `app/AutoPlanner.tsx` | Use `buildSavePlan`; add `planVersion` key to reset WeekPreview on regenerate |
| Modify | `components/WeekPreview.tsx` | Fix B2 (`key` prop driven from parent) and B3 (inline fix for empty-slot 🔄) |
| Modify | `components/MadplanUge.tsx` | Fix B4: add `loadError` state + retry button; add `loadKey` for forced refresh |
| Create | `__tests__/lib/getWeekStart.test.ts` | Tests for timezone safety + offset math |
| Create | `__tests__/lib/autoSelect.test.ts` | Tests for count, priority, fallback, dedup, edge cases |
| Create | `__tests__/lib/aggregateIngredients.test.ts` | Tests for sum, unit dedup, case normalization, sort |
| Create | `__tests__/lib/weekPlan.test.ts` | Tests for sparse plan → save entries conversion |

---

## Task 1 — Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
cd "c:/Users/arono/Desktop/Projekt Madplan/madplan"
npm install --save-dev vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Force Copenhagen timezone so getWeekStart timezone tests are deterministic
    env: { TZ: "Europe/Copenhagen" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

Open `package.json` and add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Result in scripts block:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Create the tests directory and verify the runner works**

```bash
mkdir -p "__tests__/lib"
```

Create a trivial smoke test `__tests__/lib/smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("test runner", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:
```bash
npm test
```

Expected output includes: `✓ __tests__/lib/smoke.test.ts > test runner > works`

- [ ] **Step 5: Delete the smoke test**

```bash
rm "__tests__/lib/smoke.test.ts"
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "test: add Vitest test runner"
```

---

## Task 2 — Fix `getWeekStart` timezone bug + tests

**Files:**
- Modify: `lib/queries.ts` (lines 4–11)
- Create: `__tests__/lib/getWeekStart.test.ts`

**The bug:** `monday.toISOString()` converts the local `Date` to UTC before extracting the date string. In UTC+2 (Danish summer), a Monday at 00:30 local time is Sunday 22:30 UTC — the function returns Sunday's date string instead of Monday's.

- [ ] **Step 1: Write the failing test first**

Create `__tests__/lib/getWeekStart.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getWeekStart } from "@/lib/queries";

describe("getWeekStart", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the Monday of the current week on a Wednesday", () => {
    // Wednesday 2024-06-12
    vi.setSystemTime(new Date("2024-06-12T12:00:00"));
    expect(getWeekStart(0)).toBe("2024-06-10");
  });

  it("returns the *previous* Monday when called on a Sunday", () => {
    vi.setSystemTime(new Date("2024-06-16T12:00:00")); // Sunday
    expect(getWeekStart(0)).toBe("2024-06-10");
  });

  it("returns Monday when called on a Monday", () => {
    vi.setSystemTime(new Date("2024-06-10T12:00:00"));
    expect(getWeekStart(0)).toBe("2024-06-10");
  });

  it("applies positive offset in whole weeks", () => {
    vi.setSystemTime(new Date("2024-06-10T12:00:00")); // Monday
    expect(getWeekStart(1)).toBe("2024-06-17");
    expect(getWeekStart(2)).toBe("2024-06-24");
  });

  it("applies negative offset in whole weeks", () => {
    vi.setSystemTime(new Date("2024-06-10T12:00:00"));
    expect(getWeekStart(-1)).toBe("2024-06-03");
  });

  it("returns Monday's local date at midnight in UTC+2 (timezone safety)", () => {
    // 2024-06-09T22:30:00Z = Monday 2024-06-10 00:30 CEST (UTC+2)
    // Buggy version returns "2024-06-09" (Sunday in UTC)
    // Fixed version returns "2024-06-10" (Monday in local time)
    vi.setSystemTime(new Date("2024-06-09T22:30:00Z"));
    expect(getWeekStart(0)).toBe("2024-06-10");
  });
});
```

- [ ] **Step 2: Run to verify the last test fails**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 3 "timezone safety"
```

Expected: The last test (`timezone safety`) FAILS with `expected '2024-06-09' to be '2024-06-10'` (unless you're already in UTC, in which case it passes but the timezone config in vitest.config.ts makes it deterministic).

- [ ] **Step 3: Fix `getWeekStart` in `lib/queries.ts`**

Replace lines 4–11:

```typescript
// BEFORE:
export function getWeekStart(offset = 0): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}
```

With:

```typescript
// AFTER: uses local date parts to avoid UTC conversion
export function getWeekStart(offset = 0): string {
  const now = new Date();
  const day = now.getDay(); // local day of week
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  // Use local date fields — toISOString() would convert to UTC first, causing
  // off-by-one errors in UTC+ timezones around midnight.
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm test
```

Expected: all 6 tests in `getWeekStart.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add lib/queries.ts __tests__/lib/getWeekStart.test.ts
git commit -m "fix: getWeekStart timezone bug — use local date fields instead of toISOString"
```

---

## Task 3 — Tests for `autoSelectRecipes` and `pickOneRecipe`

**Files:**
- Create: `__tests__/lib/autoSelect.test.ts`

No code changes — only tests. The existing logic is correct; we're locking it with tests.

- [ ] **Step 1: Create `__tests__/lib/autoSelect.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { autoSelectRecipes, pickOneRecipe } from "@/lib/autoSelect";
import type { Recipe } from "@/lib/types";

function r(id: string, time = 30): Recipe {
  return {
    id,
    name: `Recipe ${id}`,
    emoji: "🍕",
    time_minutes: time,
    family_id: "fam",
    created_by: "user",
    tags: [],
    category: null,
    servings: null,
    notes: null,
  };
}

// 10 recipes with varied cook times: 20, 30, 40, ... 110 min
const POOL = Array.from({ length: 10 }, (_, i) => r(`r${i}`, 20 + i * 10));

describe("autoSelectRecipes", () => {
  it("returns exactly `days` recipes when pool is large enough", () => {
    expect(autoSelectRecipes([], POOL, 5)).toHaveLength(5);
  });

  it("returns 7 unique recipes when days=7 and pool has 10", () => {
    const result = autoSelectRecipes([], POOL, 7);
    expect(result).toHaveLength(7);
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("returns all available when days > pool size", () => {
    const small = [r("a"), r("b"), r("c")];
    expect(autoSelectRecipes([], small, 10)).toHaveLength(3);
  });

  it("returns empty array when pool is empty", () => {
    expect(autoSelectRecipes([], [], 5)).toHaveLength(0);
  });

  it("returns empty array when days is 0", () => {
    expect(autoSelectRecipes([], POOL, 0)).toHaveLength(0);
  });

  it("places protein matches first", () => {
    const protein = [r("special", 30)];
    const result = autoSelectRecipes(protein, POOL, 3);
    expect(result[0].id).toBe("special");
  });

  it("protein matches do not appear twice", () => {
    // r0 is both in protein matches AND in POOL — should only appear once
    const result = autoSelectRecipes([POOL[0]], POOL, 5);
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === "r0")).toHaveLength(1);
  });

  it("hurtig tempo prefers recipes <= 30 min", () => {
    // Only r0 (20 min) and r1 (30 min) qualify for hurtig
    const fastPool = [r("fast1", 20), r("fast2", 30), r("slow1", 60)];
    const result = autoSelectRecipes([], fastPool, 2, "hurtig");
    expect(result.every((r) => r.time_minutes <= 30)).toBe(true);
  });

  it("falls back to full pool when hurtig filter yields too few", () => {
    // Only 1 recipe <= 30 min, but we want 3
    const mixed = [r("fast", 20), r("s1", 60), r("s2", 60), r("s3", 60)];
    const result = autoSelectRecipes([], mixed, 3, "hurtig");
    // Should return 3 total, falling back after the 1 fast recipe
    expect(result).toHaveLength(3);
  });

  it("weekend tempo prefers recipes >= 45 min", () => {
    const longPool = [r("long1", 60), r("long2", 90), r("short", 20)];
    const result = autoSelectRecipes([], longPool, 2, "weekend");
    expect(result.every((r) => r.time_minutes >= 45)).toBe(true);
  });

  it("mix tempo returns recipes from any time range", () => {
    // Smoke test: should just return the right count
    expect(autoSelectRecipes([], POOL, 5, "mix")).toHaveLength(5);
  });
});

describe("pickOneRecipe", () => {
  it("returns null when all recipes are used", () => {
    const usedIds = new Set(POOL.map((r) => r.id));
    expect(pickOneRecipe(POOL, usedIds)).toBeNull();
  });

  it("returns null for empty pool", () => {
    expect(pickOneRecipe([], new Set())).toBeNull();
  });

  it("returns a recipe not in usedIds", () => {
    const usedIds = new Set(POOL.slice(0, 9).map((r) => r.id)); // all except r9
    const pick = pickOneRecipe(POOL, usedIds);
    expect(pick?.id).toBe("r9");
  });

  it("never returns a used recipe", () => {
    const usedIds = new Set(POOL.slice(0, 5).map((r) => r.id));
    // Run many times since result is random
    for (let i = 0; i < 50; i++) {
      const pick = pickOneRecipe(POOL, usedIds);
      expect(pick).not.toBeNull();
      expect(usedIds.has(pick!.id)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests in `autoSelect.test.ts` pass. If any fail, that reveals a real bug to fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add __tests__/lib/autoSelect.test.ts
git commit -m "test: add comprehensive tests for autoSelectRecipes and pickOneRecipe"
```

---

## Task 4 — Extract `aggregateIngredients` + tests

**Files:**
- Create: `lib/ingredientUtils.ts`
- Modify: `lib/queries.ts` (use the extracted function)
- Create: `__tests__/lib/aggregateIngredients.test.ts`

**Why:** The aggregation loop inside `getIngredientsForMealPlan` is business logic that deserves its own test. Extracting it makes the query function purely responsible for DB access.

- [ ] **Step 1: Create `lib/ingredientUtils.ts`**

```typescript
// lib/ingredientUtils.ts
import type { AggregatedIngredient } from "@/lib/queries";

export interface RawIngredientRow {
  amount: number;
  unit: string;
  name: string; // already flattened from ingredients join
}

/**
 * Aggregates raw ingredient rows from multiple recipes into a deduplicated,
 * sorted list. Rows with the same name+unit (case-insensitive) are summed.
 */
export function aggregateIngredients(
  rows: RawIngredientRow[],
): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>();

  for (const row of rows) {
    if (!row.name) continue;
    const key = `${row.name.toLowerCase()}__${row.unit.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += row.amount;
    } else {
      map.set(key, { name: row.name, amount: row.amount, unit: row.unit });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "da"),
  );
}
```

- [ ] **Step 2: Write tests first**

Create `__tests__/lib/aggregateIngredients.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { aggregateIngredients } from "@/lib/ingredientUtils";

describe("aggregateIngredients", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateIngredients([])).toEqual([]);
  });

  it("returns a single item unchanged", () => {
    const result = aggregateIngredients([{ name: "Gulerod", amount: 2, unit: "stk" }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "Gulerod", amount: 2, unit: "stk" });
  });

  it("sums amounts for identical name and unit", () => {
    const rows = [
      { name: "Gulerod", amount: 2, unit: "stk" },
      { name: "Gulerod", amount: 3, unit: "stk" },
    ];
    const result = aggregateIngredients(rows);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5);
  });

  it("does NOT aggregate same name with different units", () => {
    const rows = [
      { name: "Mel", amount: 100, unit: "g" },
      { name: "Mel", amount: 2, unit: "dl" },
    ];
    expect(aggregateIngredients(rows)).toHaveLength(2);
  });

  it("is case-insensitive for name matching", () => {
    const rows = [
      { name: "Mælk", amount: 1, unit: "dl" },
      { name: "mælk", amount: 2, unit: "dl" },
    ];
    const result = aggregateIngredients(rows);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(3);
    // First-seen casing is preserved
    expect(result[0].name).toBe("Mælk");
  });

  it("is case-insensitive for unit matching", () => {
    const rows = [
      { name: "Smør", amount: 50, unit: "G" },
      { name: "Smør", amount: 50, unit: "g" },
    ];
    const result = aggregateIngredients(rows);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(100);
  });

  it("sorts alphabetically by name using Danish locale", () => {
    const rows = [
      { name: "Æg", amount: 2, unit: "stk" },
      { name: "Agurk", amount: 1, unit: "stk" },
      { name: "Ost", amount: 100, unit: "g" },
    ];
    const result = aggregateIngredients(rows);
    expect(result.map((r) => r.name)).toEqual(["Agurk", "Ost", "Æg"]);
  });

  it("skips rows with empty name", () => {
    const rows = [
      { name: "", amount: 1, unit: "stk" },
      { name: "Løg", amount: 2, unit: "stk" },
    ];
    const result = aggregateIngredients(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Løg");
  });

  it("handles floating point amounts correctly", () => {
    const rows = [
      { name: "Olie", amount: 0.5, unit: "dl" },
      { name: "Olie", amount: 0.5, unit: "dl" },
    ];
    const result = aggregateIngredients(rows);
    expect(result[0].amount).toBeCloseTo(1.0);
  });
});
```

- [ ] **Step 3: Run tests — they should pass (pure logic, no deps)**

```bash
npm test -- __tests__/lib/aggregateIngredients.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 4: Update `lib/queries.ts` to use `aggregateIngredients`**

In `lib/queries.ts`, import the new function and replace the inline aggregation:

```typescript
// Add to imports at top:
import { aggregateIngredients } from "@/lib/ingredientUtils";
```

Then replace the aggregation block inside `getIngredientsForMealPlan`. The function currently looks like this from line 168 to 188:

```typescript
// BEFORE:
  const map = new Map<string, AggregatedIngredient>();
  for (const row of rows as unknown as Array<{
    amount: number;
    unit: string;
    ingredients: { name: string } | null;
  }>) {
    const name = row.ingredients?.name;
    if (!name) continue;
    const key = `${name.toLowerCase()}__${row.unit.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += row.amount;
    } else {
      map.set(key, { name, amount: row.amount, unit: row.unit });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "da"),
  );
```

Replace with:

```typescript
// AFTER:
  const flatRows = (
    rows as unknown as Array<{
      amount: number;
      unit: string;
      ingredients: { name: string } | null;
    }>
  ).map((row) => ({
    name: row.ingredients?.name ?? "",
    amount: row.amount,
    unit: row.unit,
  }));

  return aggregateIngredients(flatRows);
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all previous tests still pass (no behavior change, just refactor).

- [ ] **Step 6: Commit**

```bash
git add lib/ingredientUtils.ts lib/queries.ts __tests__/lib/aggregateIngredients.test.ts
git commit -m "refactor: extract aggregateIngredients to lib/ingredientUtils + add tests"
```

---

## Task 5 — Extract `buildSavePlan` + tests

**Files:**
- Create: `lib/weekPlan.ts`
- Modify: `app/AutoPlanner.tsx` (use `buildSavePlan` instead of inline loop)
- Create: `__tests__/lib/weekPlan.test.ts`

**Why:** The `handleApprove` loop that converts `(Recipe | null)[]` to DB writes is untested business logic. Extracting it makes the critical day_of_week mapping explicit and testable.

- [ ] **Step 1: Write tests first**

Create `__tests__/lib/weekPlan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildSavePlan } from "@/lib/weekPlan";
import type { Recipe } from "@/lib/types";

function r(id: string): Recipe {
  return {
    id,
    name: `Recipe ${id}`,
    emoji: "🍕",
    time_minutes: 30,
    family_id: "fam",
    created_by: "user",
    tags: [],
    category: null,
    servings: null,
    notes: null,
  };
}

describe("buildSavePlan", () => {
  it("returns empty array for all-null plan", () => {
    expect(buildSavePlan([null, null, null])).toEqual([]);
  });

  it("returns empty array for empty plan", () => {
    expect(buildSavePlan([])).toEqual([]);
  });

  it("maps array index 0 to dayOfWeek 0 (Mandag)", () => {
    const result = buildSavePlan([r("a"), null, null]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ dayOfWeek: 0, recipeId: "a" });
  });

  it("preserves position for sparse plan — null slots are skipped", () => {
    const plan: (Recipe | null)[] = [null, null, r("c"), null, r("e")];
    const result = buildSavePlan(plan);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ dayOfWeek: 2, recipeId: "c" });
    expect(result[1]).toEqual({ dayOfWeek: 4, recipeId: "e" });
  });

  it("handles a full 7-day plan", () => {
    const plan = Array.from({ length: 7 }, (_, i) => r(`r${i}`));
    const result = buildSavePlan(plan);
    expect(result).toHaveLength(7);
    result.forEach((entry, i) => {
      expect(entry.dayOfWeek).toBe(i);
      expect(entry.recipeId).toBe(`r${i}`);
    });
  });

  it("caps at 7 days even if plan array is longer than 7", () => {
    const plan = Array.from({ length: 10 }, (_, i) => r(`r${i}`));
    const result = buildSavePlan(plan);
    expect(result).toHaveLength(7);
    expect(result[result.length - 1].dayOfWeek).toBe(6);
  });

  it("a plan with only Søndag (index 6) filled saves day 6", () => {
    const plan: (Recipe | null)[] = [null, null, null, null, null, null, r("sunday")];
    const result = buildSavePlan(plan);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ dayOfWeek: 6, recipeId: "sunday" });
  });
});
```

- [ ] **Step 2: Create `lib/weekPlan.ts`**

```typescript
// lib/weekPlan.ts
import type { Recipe } from "@/lib/types";

export interface DayEntry {
  dayOfWeek: number; // 0 = Mandag, 6 = Søndag
  recipeId: string;
}

/**
 * Converts a sparse plan array to a list of (dayOfWeek, recipeId) pairs.
 * Array index is the day_of_week. Null slots are omitted.
 * Capped at 7 days maximum.
 */
export function buildSavePlan(plan: (Recipe | null)[]): DayEntry[] {
  const entries: DayEntry[] = [];
  const limit = Math.min(plan.length, 7);
  for (let i = 0; i < limit; i++) {
    const recipe = plan[i];
    if (recipe) {
      entries.push({ dayOfWeek: i, recipeId: recipe.id });
    }
  }
  return entries;
}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- __tests__/lib/weekPlan.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 4: Update `AutoPlanner.tsx` to use `buildSavePlan`**

Add import at top of `app/AutoPlanner.tsx`:

```typescript
import { buildSavePlan } from "@/lib/weekPlan";
```

In `handleApprove`, replace the save loop:

```typescript
// BEFORE:
      await clearWeekMeals(familyId, weekStart);
      // Save each non-null day using its array index as day_of_week (0 = Mandag … 6 = Søndag)
      for (let i = 0; i < editedPlan.length; i++) {
        if (editedPlan[i]) {
          await setMeal(familyId, weekStart, i, editedPlan[i]!.id);
        }
      }
```

With:

```typescript
// AFTER:
      await clearWeekMeals(familyId, weekStart);
      const dayEntries = buildSavePlan(editedPlan);
      for (const { dayOfWeek, recipeId } of dayEntries) {
        await setMeal(familyId, weekStart, dayOfWeek, recipeId);
      }
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/weekPlan.ts app/AutoPlanner.tsx __tests__/lib/weekPlan.test.ts
git commit -m "refactor: extract buildSavePlan to lib/weekPlan + tests for sparse plan saving"
```

---

## Task 6 — Fix WeekPreview stale `editPlan` + empty-slot 🔄 bug

**Files:**
- Modify: `app/AutoPlanner.tsx` (add `planVersion` key)
- Modify: `components/WeekPreview.tsx` (fix empty-slot 🔄 handler)

**Bug B2:** When `handleRegenerate` fires and returns a new plan, `setPreviewPlan(newPlan)` passes a new `plan` prop to `WeekPreview`. But `editPlan` was initialized once from the original `plan` value and never updates — so the old edited plan is still displayed.

**Fix:** Add a `planVersion` counter in AutoPlanner. Pass it as `key` to WeekPreview. React remounts the component on key change, re-running `useState(() => plan)` with the new plan.

**Bug B3:** The 🔄 button on an empty slot calls `addSlot()`, which fills the *first* null slot rather than the clicked slot `i`. If Mandag is empty and user clicks 🔄 on Tirsdag, Mandag gets filled instead.

**Fix:** Inline the slot-specific fill logic directly in the button's onClick.

- [ ] **Step 1: Add `planVersion` state to `AutoPlanner.tsx`**

In `app/AutoPlanner.tsx`, add `planVersion` state after the existing state declarations:

```typescript
// After: const [planWarning, setPlanWarning] = useState<string | null>(null);
const [planVersion, setPlanVersion] = useState(0);
```

- [ ] **Step 2: Increment `planVersion` when generating or regenerating**

In `handleSubmit`, after `setPreviewPlan(plan)`:

```typescript
      setPreviewPlan(plan);
      setPlanVersion((v) => v + 1); // forces WeekPreview remount with fresh state
```

In `handleRegenerate`, after `if (plan.length > 0) setPreviewPlan(plan)`:

```typescript
      if (plan.length > 0) {
        setPreviewPlan(plan);
        setPlanVersion((v) => v + 1);
      }
```

- [ ] **Step 3: Pass `planVersion` as `key` to `WeekPreview`**

In the JSX where `<WeekPreview>` is rendered (inside the `previewPlan ? (...)` branch):

```tsx
// BEFORE:
<WeekPreview
  plan={previewPlan}
  allRecipes={cachedRecipes}
  ...
/>

// AFTER:
<WeekPreview
  key={planVersion}
  plan={previewPlan}
  allRecipes={cachedRecipes}
  ...
/>
```

- [ ] **Step 4: Fix the empty-slot 🔄 button in `WeekPreview.tsx`**

Find the 🔄 button handler in `components/WeekPreview.tsx` (inside the day row map):

```tsx
// BEFORE:
<button
  type="button"
  onClick={() => recipe ? refreshSlot(i) : addSlot()}
  title={recipe ? "Forslag til ny ret" : "Tilføj ret"}
  style={slotBtnStyle}
>
  🔄
</button>
```

Replace with:

```tsx
// AFTER: empty-slot click fills slot i specifically, not the first null
<button
  type="button"
  onClick={() => {
    if (recipe) {
      refreshSlot(i);
    } else {
      const usedIds = new Set(editPlan.filter(Boolean).map((r) => r!.id));
      const pick = pickOneRecipe(allRecipes, usedIds);
      if (pick) {
        setEditPlan((prev) => prev.map((r, j) => (j === i ? pick : r)));
      }
    }
  }}
  title={recipe ? "Forslag til ny ret" : "Tilføj ret"}
  style={slotBtnStyle}
>
  🔄
</button>
```

- [ ] **Step 5: Verify `addSlot` function is still used only by the "Tilføj dag" button**

Check that `addSlot` is only called by the `＋ Tilføj dag` button at the bottom of the day list:

```tsx
{editPlan.length < 7 && !editPlan.includes(null) && (
  <button type="button" onClick={addSlot} ...>
    ＋ Tilføj dag
  </button>
)}
```

If the only remaining call to `addSlot` is this one, the refactor is complete.

- [ ] **Step 6: Commit**

```bash
git add app/AutoPlanner.tsx components/WeekPreview.tsx
git commit -m "fix: WeekPreview editPlan stale after regeneration; fix empty-slot refresh targets correct slot"
```

---

## Task 7 — Fix `MadplanUge` silent error swallowing

**Files:**
- Modify: `components/MadplanUge.tsx`

**Bug B4:** The `useEffect` fetch has no `.catch()`. If `getMealPlan`, `getRecipes`, or `getIngredientsForMealPlan` throw, the error is silently discarded. `loading` still becomes `false` (via `.finally()`), so the user sees an empty week with no feedback.

**Fix:** Add `loadError` state. Add a retry button (increments `loadKey` to re-trigger the `useEffect`).

- [ ] **Step 1: Add `loadError` and `loadKey` state to `MadplanUge`**

In `components/MadplanUge.tsx`, add two new state declarations after `const [ingredientCount, ...]`:

```typescript
const [loadError, setLoadError] = useState<string | null>(null);
const [loadKey, setLoadKey] = useState(0); // increment to force a re-fetch
```

- [ ] **Step 2: Update the `useEffect` dependency array and add `.catch()`**

Find the `useEffect` and update it:

```typescript
// BEFORE:
  useEffect(() => {
    setLoading(true);
    setIngredientCount(null);
    Promise.all([
      getMealPlan(familyId, weekStart),
      getRecipes(familyId),
      getIngredientsForMealPlan(familyId, weekStart),
    ])
      .then(([plan, allRecipes, ingredients]) => {
        // ...
      })
      .finally(() => setLoading(false));
  }, [familyId, weekStart]);
```

```typescript
// AFTER:
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
        const firstPlanned = [0, 1, 2, 3, 4, 5, 6].find((i) => map[i] != null) ?? null;
        setSelectedDay(firstPlanned);
      })
      .catch(() =>
        setLoadError("Kunne ikke hente madplanen. Tjek din forbindelse og prøv igen."),
      )
      .finally(() => setLoading(false));
  }, [familyId, weekStart, loadKey]);
```

- [ ] **Step 3: Replace the day grid loading state to include the error branch**

Find the conditional that renders the loading state and day grid:

```tsx
// BEFORE:
      {loading ? (
        <div style={{ color: "#7aad8a", padding: "40px 0", textAlign: "center" }}>
          Henter madplan…
        </div>
      ) : (
        <div style={{ display: "grid", ...}}>
          {Array.from({ length: 7 }, ...)}
        </div>
      )}
```

Replace with:

```tsx
// AFTER:
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 28 }}>
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
      )}
```

- [ ] **Step 4: Commit**

```bash
git add components/MadplanUge.tsx
git commit -m "fix: add error handling to MadplanUge data fetch with retry button"
```

---

## Task 8 — Improve error messages and empty states

**Files:**
- Modify: `app/AutoPlanner.tsx`
- Modify: `components/MadplanUge.tsx` (empty week state)

**Goal:** Replace remaining vague errors with specific messages. Improve the empty week state so users understand their next action.

- [ ] **Step 1: Improve error messages in `AutoPlanner.tsx`**

Find the three `catch` blocks in `handleSubmit`, `handleRegenerate`, and `handleApprove` and make their messages specific:

```typescript
// handleSubmit catch — "Ingen opskrifter fundet" is already good.
// But the generic catch should be more specific:
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke generere ugeplanen. Tjek din forbindelse og prøv igen.",
      );
    }
```

```typescript
// handleRegenerate catch:
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke regenerere ugeplanen. Prøv igen.",
      );
    }
```

```typescript
// handleApprove catch:
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke gemme ugeplanen. Tjek din forbindelse og prøv igen.",
      );
      setApproving(false);
    }
```

- [ ] **Step 2: Improve the empty week message in `MadplanUge.tsx`**

When `loading` is false, `loadError` is null, AND `plannedCount === 0`, the week grid renders with all empty slots. Currently no guidance is shown. Add a call-to-action below the grid:

Find the end of the day grid block (after `</div>` closing the grid), add:

```tsx
        {/* Empty week guidance */}
        {!loading && !loadError && plannedCount === 0 && (
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
```

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/AutoPlanner.tsx components/MadplanUge.tsx
git commit -m "improve: specific error messages and empty week guidance in MadplanUge"
```

---

## Self-Review

### Spec coverage

| Requirement | Task(s) |
|-------------|---------|
| Audit core flows for edge cases | Tasks 2, 6, 7 (bugs identified + fixed) |
| Extract + centralize core business logic | Tasks 4, 5 (`ingredientUtils`, `weekPlan`) |
| Make temporary/persisted state explicit | Task 6 (`planVersion` key makes plan version explicit) |
| Avoid duplicated logic in UI components | Task 5 (`buildSavePlan` extracted from AutoPlanner) |
| Tests: week generation count | Task 3 (`autoSelect.test.ts`) |
| Tests: preview approval persistence | Task 5 (`weekPlan.test.ts` — sparse plan → day entries) |
| Tests: shopping list generation | Task 4 (`aggregateIngredients.test.ts`) |
| Tests: replace/remove day recipe | B3 fix in Task 6; sparse handling in Task 5 |
| Tests: empty week handling | Task 3 (empty pool), Task 5 (all-null plan) |
| Better loading states | Task 7 (MadplanUge) |
| Clearer error messages | Task 8 |
| Better empty states | Task 8 (empty week guidance) |
| Remove vague "Ukendt fejl" | Task 8 |

### Known non-covered items (out of scope)

- **Component-level tests** (RecipePicker modal, DagSlot interactions): requires `jsdom` + React Testing Library. Separate task.
- **`confirm()` in `handleApprove`**: Blocking browser dialog is a UX issue. Replacing with a modal is a feature, not a stability fix.
- **Unit aggregation across different unit strings** (e.g. "g" vs "gram"): domain normalization is out of scope here.
