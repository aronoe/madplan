"use client";

import { useEffect, useState } from "react";
import { getIngredientsForMealPlan, getMealPlan, getWeekStart } from "@/lib/queries";
import type { AggregatedIngredient } from "@/lib/queries";
import type { Recipe } from "@/lib/types";
import ShoppingHeader from "@/components/shopping/ShoppingHeader";
import ShoppingProgress from "@/components/shopping/ShoppingProgress";
import ShoppingCategoryGroup from "@/components/shopping/ShoppingCategoryGroup";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import EmptyState from "@/components/ui/EmptyState";

const CATEGORY_ORDER = ["Kød & fisk", "Grønt", "Køl", "Basisvarer"];

function categorize(name: string): string {
  const n = name.toLowerCase();
  if (/kylling|oksekød|svin|bacon|laks|torsk|tun|fisk|rejer|skaldyr|kød|pølse|skinke|kalkun|and/.test(n))
    return "Kød & fisk";
  if (/løg|gulerod|kartoffel|tomat|salat|grønt|spinat|broccoli|porre|hvidløg|squash|peberfrugt|agurk|selleri|kål|svamp|majs|bønner|ærter|asparges|artiskok/.test(n))
    return "Grønt";
  if (/mælk|smør|fløde|ost|æg|yoghurt|cremefraiche|skyr|kvark|ricotta|mozz/.test(n))
    return "Køl";
  return "Basisvarer";
}

function groupByCategory(items: AggregatedIngredient[]) {
  const map = new Map<string, AggregatedIngredient[]>();
  for (const item of items) {
    const cat = categorize(item.name);
    const existing = map.get(cat);
    if (existing) existing.push(item);
    else map.set(cat, [item]);
  }
  return CATEGORY_ORDER
    .filter((cat) => map.has(cat))
    .map((cat) => ({ category: cat, items: map.get(cat)! }));
}

export default function ShoppingListClient({ familyId }: { familyId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([]);
  const [meals, setMeals] = useState<Pick<Recipe, "name" | "emoji">[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [offerIngredients, setOfferIngredients] = useState<string[]>([]);

  const weekStart = getWeekStart(weekOffset);

  const monday = new Date(weekStart);
  const sunday = new Date(weekStart);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  const weekLabel = `${fmt(monday)} \u2013 ${fmt(sunday)}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("offerIngredients");
      setOfferIngredients(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setOfferIngredients([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    setChecked(JSON.parse(localStorage.getItem(`shopping-checked-${weekStart}`) ?? "{}"));
    Promise.all([
      getIngredientsForMealPlan(familyId, weekStart),
      getMealPlan(familyId, weekStart),
    ])
      .then(([ings, plan]) => {
        setIngredients(ings);
        setMeals(
          (plan ?? [])
            .map((p) => p.recipe as unknown as Pick<Recipe, "name" | "emoji">)
            .filter(Boolean),
        );
      })
      .catch((err: unknown) =>
        setFetchError(err instanceof Error ? err.message : "Ukendt fejl"),
      )
      .finally(() => setLoading(false));
  }, [familyId, weekStart]);

  function toggleChecked(key: string) {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`shopping-checked-${weekStart}`, JSON.stringify(next));
      return next;
    });
  }

  function clearChecked() {
    setChecked({});
    localStorage.removeItem(`shopping-checked-${weekStart}`);
  }

  const itemKey = (ing: AggregatedIngredient) =>
    `${ing.name.toLowerCase()}__${ing.unit.toLowerCase()}`;
  const isOffer = (ing: AggregatedIngredient) =>
    offerIngredients.some((o) => ing.name.toLowerCase().includes(o.toLowerCase()));

  const unchecked = ingredients.filter((i) => !checked[itemKey(i)] && !isOffer(i));
  const offerItems = ingredients.filter((i) => !checked[itemKey(i)] && isOffer(i));
  const checkedItems = ingredients.filter((i) => checked[itemKey(i)]);
  const allDone = ingredients.length > 0 && unchecked.length === 0 && offerItems.length === 0;

  return (
    <div>
      <ShoppingHeader
        weekLabel={weekLabel}
        weekOffset={weekOffset}
        onPrev={() => setWeekOffset((o) => o - 1)}
        onNext={() => setWeekOffset((o) => o + 1)}
        onToday={() => setWeekOffset(0)}
      />

      {loading ? (
        <div className="text-(--color-text-muted) py-10 text-center">
          Henter indkøbsliste\u2026
        </div>
      ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
          <strong>Fejl:</strong> {fetchError}
        </div>
      ) : ingredients.length === 0 ? (
        <EmptyState
          icon="🥗"
          message={
            meals.length === 0
              ? "Ingen retter planlagt denne uge. Gå til madplanen og tilføj nogle."
              : "Ingen ingredienser fundet. Tilføj ingredienser til dine opskrifter."
          }
        />
      ) : (
        <>
          {/* Meals this week */}
          {meals.length > 0 && (
            <div className="bg-(--color-primary-subtle) rounded-xl px-4 py-2.5 mb-5 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-(--color-text-mid) uppercase tracking-wide mr-1">
                Denne uge:
              </span>
              {meals.map((m, i) => (
                <span key={i} className="text-[13px] bg-(--color-surface) border border-(--color-border) rounded-lg px-2.5 py-0.5 text-(--color-text) font-semibold">
                  {m.emoji} {m.name}
                </span>
              ))}
            </div>
          )}

          <ShoppingProgress
            total={ingredients.length}
            bought={checkedItems.length + offerItems.length}
            allDone={allDone}
            hasChecked={checkedItems.length > 0}
            onClearChecked={clearChecked}
          />

          {/* Unchecked — grouped by category */}
          {groupByCategory(unchecked).map(({ category, items }) => (
            <ShoppingCategoryGroup
              key={category}
              category={category}
              items={items}
              checked={checked}
              offerIngredients={offerIngredients}
              itemKey={itemKey}
              onToggle={toggleChecked}
            />
          ))}

          {/* Offer items */}
          {offerItems.length > 0 && (
            <div className="bg-(--color-surface) rounded-[14px] overflow-hidden shadow-[0_1px_8px_rgba(0,80,40,.07)] mb-4 opacity-75">
              {offerItems.map((ing, i) => (
                <ShoppingItemRow
                  key={itemKey(ing)}
                  ingredient={ing}
                  checked={false}
                  isOffer={true}
                  isLast={i === offerItems.length - 1}
                  onToggle={() => toggleChecked(itemKey(ing))}
                />
              ))}
            </div>
          )}

          {/* Checked items */}
          {checkedItems.length > 0 && (
            <div className="bg-(--color-surface) rounded-[14px] overflow-hidden opacity-60 shadow-[0_1px_8px_rgba(0,80,40,.04)]">
              {checkedItems.map((ing, i) => (
                <ShoppingItemRow
                  key={itemKey(ing)}
                  ingredient={ing}
                  checked={true}
                  isOffer={false}
                  isLast={i === checkedItems.length - 1}
                  onToggle={() => toggleChecked(itemKey(ing))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
