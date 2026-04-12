import type { AggregatedIngredient } from "@/lib/queries";
import ShoppingItemRow from "./ShoppingItemRow";

interface ShoppingCategoryGroupProps {
  category: string;
  items: AggregatedIngredient[];
  checked: Record<string, boolean>;
  offerIngredients: string[];
  itemKey: (ing: AggregatedIngredient) => string;
  onToggle: (key: string) => void;
}

export default function ShoppingCategoryGroup({
  category,
  items,
  checked,
  offerIngredients,
  itemKey,
  onToggle,
}: ShoppingCategoryGroupProps) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted) mb-2 pl-1">
        {category}
      </div>
      <div className="bg-(--color-surface) rounded-xl overflow-hidden border border-(--color-border) shadow-sm">
        {items.map((ing, i) => {
          const key = itemKey(ing);
          return (
            <ShoppingItemRow
              key={key}
              ingredient={ing}
              checked={checked[key] ?? false}
              isOffer={offerIngredients.some((o) => ing.name.toLowerCase().includes(o.toLowerCase()))}
              isLast={i === items.length - 1}
              onToggle={() => onToggle(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
