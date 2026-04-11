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
