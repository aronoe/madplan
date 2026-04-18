// lib/ingredientUtils.ts
import type { AggregatedIngredient } from "@/lib/queries";

export interface RawIngredientRow {
  id: string;   // recipe_ingredient_id
  amount: number;
  unit: string;
  name: string; // already flattened from ingredients join
}

/**
 * Sorts raw ingredient rows by name for display. Each row keeps its own
 * recipe_ingredient_id — no amounts are summed across rows so every line
 * can be checked independently in the shopping list.
 */
export function aggregateIngredients(
  rows: RawIngredientRow[],
): AggregatedIngredient[] {
  return rows
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name, "da"));
}
