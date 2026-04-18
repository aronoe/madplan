import type { AggregatedIngredient } from "@/lib/queries";
import { aggregateGroupAmount } from "@/lib/unitNormalization";
import ShoppingItemRow from "./ShoppingItemRow";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface ShoppingCategoryGroupProps {
  category: string;
  items: AggregatedIngredient[];
  checked: Set<string>;         // Set of recipe_ingredient_ids
  offerIngredients: string[];
  onToggle: (ids: string[]) => void;
}


type NameGroup = { name: string; entries: AggregatedIngredient[] };

function groupByName(items: AggregatedIngredient[]): NameGroup[] {
  const map = new Map<string, AggregatedIngredient[]>();
  for (const item of items) {
    const k = item.name.toLowerCase().trim();
    const existing = map.get(k);
    if (existing) existing.push(item);
    else map.set(k, [item]);
  }
  return Array.from(map.values()).map((entries) => ({
    name: entries[0].name,
    entries,
  }));
}

export default function ShoppingCategoryGroup({
  category,
  items,
  checked,
  offerIngredients,
  onToggle,
}: ShoppingCategoryGroupProps) {
  const groups = groupByName(items);

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mb-2 pl-1">
        {category}
      </div>
      <div className="bg-(--color-surface) rounded-xl overflow-hidden border border-(--color-border) shadow-sm">
        {groups.map((group, gi) => {
          const isLastGroup = gi === groups.length - 1;
          const allChecked = group.entries.every((e) => checked.has(e.id));
          const someChecked = group.entries.some((e) => checked.has(e.id));
          const isIndeterminate = !allChecked && someChecked;
          const groupIds = group.entries.map((e) => e.id);

          /* ── Single entry: plain row ── */
          if (group.entries.length === 1) {
            const ing = group.entries[0];
            return (
              <ShoppingItemRow
                key={ing.id}
                ingredient={ing}
                checked={checked.has(ing.id)}
                isOffer={offerIngredients.some((o) =>
                  ing.name.toLowerCase().includes(o.toLowerCase()),
                )}
                isLast={isLastGroup}
                onToggle={() => onToggle([ing.id])}
              />
            );
          }

          /* ── Multiple entries: compact aggregated row ── */
          const agg = aggregateGroupAmount(group.entries, group.name);

          return (
            <div
              key={group.name.toLowerCase().trim()}
              role="checkbox"
              aria-checked={allChecked ? true : isIndeterminate ? "mixed" : false}
              tabIndex={0}
              onClick={() => onToggle(groupIds)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onToggle(groupIds);
                }
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-(--color-surface-2) transition-colors",
                !isLastGroup && "border-b border-(--color-border)",
                allChecked && "opacity-50",
              )}
            >
              {/* Three-state checkbox */}
              {allChecked ? (
                <div className="w-5 h-5 rounded border-2 border-(--color-primary) bg-(--color-primary) shrink-0 flex items-center justify-center text-white">
                  <Check size={11} />
                </div>
              ) : isIndeterminate ? (
                <div className="w-5 h-5 rounded border-2 border-(--color-primary) shrink-0 flex items-center justify-center text-(--color-primary)">
                  <Minus size={11} />
                </div>
              ) : (
                <div className="w-5 h-5 rounded border-2 border-(--color-border) shrink-0 bg-(--color-bg)" />
              )}

              {/* Name + recipe count */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    allChecked
                      ? "line-through text-(--color-text-muted)"
                      : "text-(--color-text)",
                  )}
                >
                  {group.name}
                </span>
                <span className="block text-xs text-(--color-text-muted) mt-0.5">
                  Fra {group.entries.length} retter
                </span>
              </div>

              {/* Amount: aggregated total or joined fallback — always meaningful */}
              <span
                className={cn(
                  "text-sm font-semibold shrink-0 whitespace-nowrap",
                  allChecked
                    ? "line-through text-(--color-text-muted)"
                    : "text-(--color-text-mid)",
                )}
              >
                {agg.display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
