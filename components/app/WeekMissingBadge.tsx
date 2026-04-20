"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { getIngredientsForMealPlan, getShoppingChecked, getWeekStart } from "@/lib/queries";
import {
  computeMissingGroups,
  getShoppingBadgeCount,
  setShoppingBadgeCount,
  subscribeShoppingBadge,
} from "@/lib/shoppingBadgeStore";

export default function WeekMissingBadge() {
  // storeCount is null when uninitialised or after invalidation
  const storeCount = useSyncExternalStore(
    subscribeShoppingBadge,
    getShoppingBadgeCount,
    () => null,
  );

  // Keep last known value so badge doesn't flicker during re-fetch
  const [displayCount, setDisplayCount] = useState<number | null>(null);

  useEffect(() => {
    if (storeCount !== null) {
      // Shopping list or another mutation already computed the count — use it directly
      setDisplayCount(storeCount);
      return;
    }

    // storeCount is null: either first render or after invalidation — re-fetch
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userData } = await supabase
        .from("users").select("family_id").eq("id", user.id).single();
      if (!userData?.family_id || cancelled) return;
      const weekStart = getWeekStart(0);
      const [ings, checked] = await Promise.all([
        getIngredientsForMealPlan(userData.family_id, weekStart),
        getShoppingChecked(userData.family_id, weekStart),
      ]);
      if (cancelled) return;
      // Writing to store triggers re-render with non-null storeCount → setDisplayCount above
      setShoppingBadgeCount(computeMissingGroups(ings, (id) => checked.has(id)));
    }
    load().catch(() => {});
    return () => { cancelled = true; };
  }, [storeCount]); // re-runs whenever store is invalidated (storeCount → null)

  if (!displayCount) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] bg-(--color-primary) text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none pointer-events-none">
      {displayCount > 99 ? "99+" : displayCount}
    </span>
  );
}
