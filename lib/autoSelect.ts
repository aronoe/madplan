import type { Recipe } from "@/lib/types";

export type Tempo = "hurtig" | "mix" | "weekend";

// Returns up to `days` recipes. Never throws — always returns as many as possible.
// Priority: queued → protein matches → favorites-first tempo fill → fallback
export function autoSelectRecipes(
  proteinMatches: Recipe[],
  allRecipes: Recipe[],
  days: number,
  tempo: Tempo = "mix",
): Recipe[] {
  const selected: Recipe[] = [];
  const usedIds = new Set<string>();

  // 0. Queued recipes first, sorted by queue_order (nulls last)
  const queued = allRecipes
    .filter((r) => r.queue_for_next_plan)
    .sort((a, b) => {
      if (a.queue_order === null && b.queue_order === null) return 0;
      if (a.queue_order === null) return 1;
      if (b.queue_order === null) return -1;
      return a.queue_order - b.queue_order;
    });
  for (const r of queued) {
    if (selected.length >= days) break;
    if (!usedIds.has(r.id)) {
      selected.push(r);
      usedIds.add(r.id);
    }
  }

  // 1. Protein matches (highest score first, already sorted by caller)
  for (const r of proteinMatches) {
    if (selected.length >= days) break;
    if (!usedIds.has(r.id)) {
      selected.push(r);
      usedIds.add(r.id);
    }
  }

  if (selected.length >= days) return selected;

  // 2. Tempo-filtered fill pool, favorites sorted first within pool
  const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);

  let tempoPool: Recipe[] = shuffled;
  if (tempo === "hurtig") {
    tempoPool = shuffled.filter((r) => r.time_minutes <= 30);
  } else if (tempo === "weekend") {
    tempoPool = shuffled.filter((r) => r.time_minutes >= 45);
  }

  const sortedTempoPool = [
    ...tempoPool.filter((r) => r.is_favorite),
    ...tempoPool.filter((r) => !r.is_favorite),
  ];

  for (const r of sortedTempoPool) {
    if (selected.length >= days) break;
    if (!usedIds.has(r.id)) {
      selected.push(r);
      usedIds.add(r.id);
    }
  }

  // 3. Fallback: full pool if tempo pool was insufficient
  if (selected.length < days) {
    const sortedFull = [
      ...shuffled.filter((r) => r.is_favorite),
      ...shuffled.filter((r) => !r.is_favorite),
    ];
    for (const r of sortedFull) {
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
