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
