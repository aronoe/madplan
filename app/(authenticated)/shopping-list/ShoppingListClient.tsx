"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getIngredientsForMealPlan,
  getMealPlan,
  getRecipe,
  getIngredientsForRecipe,
  getShoppingChecked,
  setShoppingItemChecked,
  clearShoppingChecked,
  getWeekStart,
} from "@/lib/queries";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = searchParams.get("recipeId");

  const [weekOffset, setWeekOffset] = useState(0);
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([]);
  const [meals, setMeals] = useState<Pick<Recipe, "name" | "emoji">[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // checked: Record<recipe_ingredient_id, boolean>
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [offerIngredients, setOfferIngredients] = useState<string[]>([]);
  const [recipeFilter, setRecipeFilter] = useState<Set<string> | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

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
    Promise.all([
      getIngredientsForMealPlan(familyId, weekStart),
      getMealPlan(familyId, weekStart),
      getShoppingChecked(familyId, weekStart),
    ])
      .then(([ings, plan, checkedIds]) => {
        setIngredients(ings);
        setMeals(
          (plan ?? [])
            .map((p) => p.recipe as unknown as Pick<Recipe, "name" | "emoji">)
            .filter(Boolean),
        );
        const checkedMap: Record<string, boolean> = {};
        for (const id of checkedIds) checkedMap[id] = true;
        setChecked(checkedMap);
      })
      .catch((err: unknown) =>
        setFetchError(err instanceof Error ? err.message : "Ukendt fejl"),
      )
      .finally(() => setLoading(false));
  }, [familyId, weekStart]);

  // Recipe filter: match by recipe_ingredient_id (exact same IDs as AggregatedIngredient.id)
  useEffect(() => {
    if (!recipeId) {
      setRecipeFilter(null);
      setSelectedRecipe(null);
      return;
    }
    Promise.all([
      getIngredientsForRecipe(recipeId),
      getRecipe(recipeId),
    ])
      .then(([ings, recipe]) => {
        setRecipeFilter(new Set(ings.map((i) => i.id)));
        setSelectedRecipe(recipe as unknown as Recipe);
      })
      .catch(() => {
        setRecipeFilter(null);
        setSelectedRecipe(null);
      });
  }, [recipeId]);

  // Tracks IDs currently being written to Supabase.
  // Using a ref (not state) so updates don't trigger re-renders.
  const savingIds = useRef<Set<string>>(new Set());

  // Toggle one or more recipe_ingredient_ids together.
  // If all are currently checked → uncheck all; otherwise → check all.
  function toggleChecked(ids: string[]) {
    // Outer guard: skip if any ID is already in-flight (double-click protection)
    if (ids.some((id) => savingIds.current.has(id))) {
      console.log("[shopping] toggle ignored — already saving:", ids);
      return;
    }

    setChecked((prev) => {
      const allChecked = ids.every((id) => prev[id]);
      const newValue = !allChecked;
      const next = { ...prev };
      for (const id of ids) next[id] = newValue;
      const changed = ids.filter((id) => Boolean(prev[id]) !== newValue);

      if (changed.length > 0) {
        // Inner guard: filter out IDs already claimed by a concurrent invocation.
        // This is the key fix for React StrictMode, which calls state updaters
        // twice in development — the second call would otherwise launch a
        // duplicate DB write for the same IDs.
        const toSave = changed.filter((id) => !savingIds.current.has(id));
        if (toSave.length > 0) {
          for (const id of toSave) savingIds.current.add(id);
          console.log("[shopping] toggle item", { ids: toSave, newValue });
          Promise.all(
            toSave.map((id) => setShoppingItemChecked(familyId, weekStart, id, newValue)),
          )
            .catch(() => {
              console.error("[shopping] toggle failed, reverting:", toSave);
              setChecked(prev);
            })
            .finally(() => {
              for (const id of toSave) savingIds.current.delete(id);
            });
        }
      }

      return next;
    });
  }

  function clearChecked() {
    setChecked({});
    clearShoppingChecked(familyId, weekStart).catch(() => {
      // Silently ignore — the cleared state is already applied locally
    });
  }

  const isOffer = (ing: AggregatedIngredient) =>
    offerIngredients.some((o) => ing.name.toLowerCase().includes(o.toLowerCase()));

  const visibleIngredients = recipeFilter
    ? ingredients.filter((i) => recipeFilter.has(i.id))
    : ingredients;

  const unchecked = visibleIngredients.filter((i) => !checked[i.id] && !isOffer(i));
  const offerItems = visibleIngredients.filter((i) => !checked[i.id] && isOffer(i));
  const checkedItems = visibleIngredients.filter((i) => checked[i.id]);

  // Group-aware progress: a "group" = unique ingredient name.
  // A group is bought when every row with that name is checked or an offer.
  const visibleByName = new Map<string, AggregatedIngredient[]>();
  for (const i of visibleIngredients) {
    const k = i.name.toLowerCase().trim();
    const arr = visibleByName.get(k);
    if (arr) arr.push(i);
    else visibleByName.set(k, [i]);
  }
  const totalGroupCount = visibleByName.size;
  const boughtGroupCount = Array.from(visibleByName.values()).filter(
    (rows) => rows.every((r) => checked[r.id] || isOffer(r)),
  ).length;
  const allDone = totalGroupCount > 0 && boughtGroupCount === totalGroupCount;

  // Convert checked record to a Set for ShoppingCategoryGroup
  const checkedIdSet = new Set(
    Object.keys(checked).filter((id) => checked[id]),
  );

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
        <div className="bg-(--color-danger-subtle) border border-(--color-danger) rounded-xl px-5 py-4 text-(--color-danger) text-sm">
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
          {/* Recipe filter card */}
          {recipeId ? (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-4 mb-5 flex items-center gap-4">
              {selectedRecipe?.image_url ? (
                <img
                  src={selectedRecipe.image_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <span className="text-3xl leading-none shrink-0">{selectedRecipe?.emoji ?? "🍽️"}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-(--color-text-muted) m-0">Varer til</p>
                <p className="text-base font-semibold text-(--color-text) m-0 truncate">
                  {selectedRecipe?.name ?? "…"}
                </p>
                <p className="text-xs text-(--color-text-muted) m-0 mt-0.5">
                  {boughtGroupCount} / {totalGroupCount} varer købt
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.replace("/shopping-list")}
                className="shrink-0 text-sm text-(--color-primary) font-medium cursor-pointer hover:underline whitespace-nowrap"
              >
                Vis hele ugens liste
              </button>
            </div>
          ) : (
            /* Meals this week */
            meals.length > 0 && (
              <div className="bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-3 mb-5 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mr-1">
                  Denne uge:
                </span>
                {meals.map((m, i) => (
                  <span key={i} className="text-sm bg-(--color-bg) border border-(--color-border) rounded-lg px-2.5 py-0.5 text-(--color-text)">
                    {m.emoji} {m.name}
                  </span>
                ))}
              </div>
            )
          )}

          <ShoppingProgress
            total={totalGroupCount}
            bought={boughtGroupCount}
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
              checked={checkedIdSet}
              offerIngredients={offerIngredients}
              onToggle={toggleChecked}
            />
          ))}

          {/* Offer items */}
          {offerItems.length > 0 && (
            <div className="bg-(--color-surface) rounded-xl overflow-hidden border border-(--color-border) shadow-sm mb-4 opacity-75">
              {offerItems.map((ing, i) => (
                <ShoppingItemRow
                  key={ing.id}
                  ingredient={ing}
                  checked={false}
                  isOffer={true}
                  isLast={i === offerItems.length - 1}
                  onToggle={() => toggleChecked([ing.id])}
                />
              ))}
            </div>
          )}

          {/* Checked items */}
          {checkedItems.length > 0 && (
            <div className="bg-(--color-surface) rounded-xl overflow-hidden border border-(--color-border) opacity-60">
              {checkedItems.map((ing, i) => (
                <ShoppingItemRow
                  key={ing.id}
                  ingredient={ing}
                  checked={true}
                  isOffer={false}
                  isLast={i === checkedItems.length - 1}
                  onToggle={() => toggleChecked([ing.id])}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
