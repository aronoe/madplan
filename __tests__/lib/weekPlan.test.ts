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
