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
