"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIngredientsForMealPlan, getShoppingChecked } from "@/lib/queries";
import { ShoppingCart } from "lucide-react";

export default function WeekStatusBar({
  familyId,
  weekStart,
  plannedDays,
}: {
  familyId: string;
  weekStart: string;
  plannedDays: number;
}) {
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [missingItems, setMissingItems] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getIngredientsForMealPlan(familyId, weekStart),
      getShoppingChecked(familyId, weekStart),
    ])
      .then(([ingredients, checked]) => {
        setTotalItems(ingredients.length);
        setMissingItems(ingredients.filter((i) => !checked.has(i.id)).length);
      })
      .catch(() => {});
  }, [familyId, weekStart]);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-(--color-surface) rounded-xl border border-(--color-border) text-sm">
      <span className="text-(--color-text-muted)">
        <span className="font-semibold text-(--color-text)">{plannedDays}</span>
        /7 dage
      </span>

      {totalItems !== null && (
        <>
          <span className="text-(--color-border)">·</span>
          <span className="text-(--color-text-muted)">
            <span className="font-semibold text-(--color-text)">{totalItems}</span> varer
          </span>
        </>
      )}

      {missingItems !== null && missingItems > 0 && (
        <>
          <span className="text-(--color-border)">·</span>
          <span className="text-(--color-danger)">{missingItems} mangler i denne uge</span>
        </>
      )}

      <div className="flex-1" />

      <Link
        href="/shopping-list"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-primary) hover:underline underline-offset-2"
      >
        <ShoppingCart size={13} />
        Indkøbsliste
      </Link>
    </div>
  );
}
