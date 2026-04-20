import type { AggregatedIngredient } from "./queries";

// Computes number of ingredient name-groups where not all rows are checked.
// Shared between WeekMissingBadge (initial fetch) and ShoppingListClient (live updates).
export function computeMissingGroups(
  ingredients: AggregatedIngredient[],
  isChecked: (id: string) => boolean,
): number {
  const byName = new Map<string, string[]>();
  for (const ing of ingredients) {
    const key = ing.name.toLowerCase().trim();
    const arr = byName.get(key);
    if (arr) arr.push(ing.id);
    else byName.set(key, [ing.id]);
  }
  return Array.from(byName.values()).filter(
    (ids) => !ids.every(isChecked),
  ).length;
}

// ── Module-level store ────────────────────────────────────────────────────────

type Listener = () => void;

let _count: number | null = null;
const _listeners = new Set<Listener>();

export function getShoppingBadgeCount(): number | null {
  return _count;
}

export function setShoppingBadgeCount(n: number): void {
  _count = n;
  _listeners.forEach((l) => l());
}

// Call when this week's meal plan changes (recipe added/removed/replaced).
// Sets count to null so WeekMissingBadge knows to re-fetch from DB.
export function invalidateCurrentWeekBadge(): void {
  _count = null;
  _listeners.forEach((l) => l());
}

export function subscribeShoppingBadge(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
