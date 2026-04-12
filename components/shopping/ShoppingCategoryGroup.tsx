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
      <div className="text-[11px] font-bold uppercase tracking-[0.7px] text-(--color-text-muted) mb-1.5 pl-1">
        {category}
      </div>
      <div className="bg-(--color-surface) rounded-[14px] overflow-hidden shadow-[0_1px_8px_rgba(0,80,40,.07)]">
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
