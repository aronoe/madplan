import type { AggregatedIngredient } from "@/lib/queries";
import Badge from "@/components/ui/Badge";
import { Check, Tag } from "lucide-react";
import { cn } from "@/lib/cn";

function formatAmount(amount: number): string {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1);
}

interface ShoppingItemRowProps {
  ingredient: AggregatedIngredient;
  checked: boolean;
  isOffer: boolean;
  isLast: boolean;
  onToggle: () => void;
}

export default function ShoppingItemRow({
  ingredient: ing,
  checked,
  isOffer,
  isLast,
  onToggle,
}: ShoppingItemRowProps) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3.5 px-4.5 py-3.25 cursor-pointer",
        !isLast && "border-b border-(--color-border)",
      )}
    >
      {/* Checkbox */}
      {checked ? (
        <div className="w-5.5 h-5.5 rounded-md border-2 border-(--color-primary) bg-(--color-primary) shrink-0 flex items-center justify-center text-white">
          <Check size={12} />
        </div>
      ) : isOffer ? (
        <div className="w-5.5 h-5.5 rounded-md border-2 border-(--color-primary) shrink-0 bg-(--color-primary-subtle) flex items-center justify-center text-(--color-primary)">
          <Tag size={12} />
        </div>
      ) : (
        <div className="w-5.5 h-5.5 rounded-md border-2 border-(--color-border) shrink-0 bg-(--color-bg)" />
      )}

      {/* Name */}
      <span
        className={cn(
          "flex-1 text-sm",
          checked && "line-through text-(--color-text-muted)",
          !checked && isOffer && "line-through text-(--color-text-muted)",
          !checked && !isOffer && "font-medium text-(--color-text)",
        )}
      >
        {ing.name}
      </span>

      {/* Offer badge */}
      {isOffer && !checked && (
        <Badge variant="offer">
          <Tag size={10} className="inline-block mr-1" />
          tilbud
        </Badge>
      )}

      {/* Amount */}
      <span
        className={cn(
          "text-sm font-semibold whitespace-nowrap",
          checked || isOffer ? "line-through text-(--color-text-muted)" : "text-(--color-text-mid)",
        )}
      >
        {formatAmount(ing.amount)} {ing.unit}
      </span>
    </div>
  );
}
