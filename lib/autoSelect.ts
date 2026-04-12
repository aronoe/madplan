import type { Recipe } from "@/lib/types";

export type Tempo = "hurtig" | "mix" | "weekend";

// TODO: replace with offer API
// Returns up to `days` recipes. Never throws — always returns as many as possible.
// proteinMatches are pre-scored (most ingredient matches first) by getRecipesWithIngredient.
export function autoSelectRecipes(
  proteinMatches: Recipe[],
  allRecipes: Recipe[],
  days: number,
  tempo: Tempo = "mix",
): Recipe[] {
  const selected: Recipe[] = [];
  const usedIds = new Set<string>();

  // 1. Prioritize recipes matching selected ingredients (highest score first)
  for (const r of proteinMatches) {
    if (selected.length >= days) break;
    if (!usedIds.has(r.id)) {
      selected.push(r);
      usedIds.add(r.id);
    }
  }

  if (selected.length >= days) return selected;

  // 2. Build fill pool, trying to honour tempo preference
  const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);

  // Attempt tempo-filtered pool first
  let tempoPool: Recipe[] = shuffled;
  if (tempo === "hurtig") {
    tempoPool = shuffled.filter((r) => r.time_minutes <= 30);
  } else if (tempo === "weekend") {
    tempoPool = shuffled.filter((r) => r.time_minutes >= 45);
  }

  // Fill from tempo pool
  for (const r of tempoPool) {
    if (selected.length >= days) break;
    if (!usedIds.has(r.id)) {
      selected.push(r);
      usedIds.add(r.id);
    }
  }

  // 3. Fallback: if tempo pool was insufficient, fill remaining from the full shuffled pool
  if (selected.length < days) {
    for (const r of shuffled) {
      if (selected.length >= days) break;
      if (!usedIds.has(r.id)) {
        selected.push(r);
        usedIds.add(r.id);
      }
    }
  }

  return selected;
}

// Refresh a single slot: pick a random recipe not already used in the plan
export function pickOneRecipe(
  allRecipes: Recipe[],
  usedIds: Set<string>,
): Recipe | null {
  const pool = allRecipes.filter((r) => !usedIds.has(r.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
