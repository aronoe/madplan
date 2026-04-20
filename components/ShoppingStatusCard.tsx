"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIngredientsForMealPlan, getShoppingChecked } from "@/lib/queries";
import { ShoppingCart } from "lucide-react";

export default function ShoppingStatusCard({
  familyId,
  weekStart,
  plannedDays,
}: {
  familyId: string;
  weekStart: string;
  plannedDays: number;
}) {
  const [weekMissing, setWeekMissing] = useState<number | null>(null);
  const [weekTotal, setWeekTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getIngredientsForMealPlan(familyId, weekStart),
      getShoppingChecked(familyId, weekStart),
    ])
      .then(([weekIngs, checked]) => {
        if (cancelled) return;
        setWeekTotal(weekIngs.length);
        setWeekMissing(weekIngs.filter((i) => !checked.has(i.id)).length);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [familyId, weekStart]);

  return (
    <div className="bg-(--color-bg) border border-(--color-border)/60 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-(--color-text-muted) m-0 leading-snug">
          <span className="font-medium text-(--color-text)">
            {weekMissing === null
              ? "Henter…"
              : weekMissing === 0
              ? "Alt klar til ugen"
              : `${weekMissing} mangler i denne uge`}
          </span>
          {weekTotal !== null && (
            <span className="opacity-70"> · {weekTotal} varer · {plannedDays}/7 dage planlagt</span>
          )}
        </p>
      </div>

      <Link
        href="/shopping-list"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-primary) hover:underline underline-offset-2 transition-colors shrink-0"
      >
        <ShoppingCart size={12} />
        Indkøbsliste
      </Link>
    </div>
  );
}
