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
