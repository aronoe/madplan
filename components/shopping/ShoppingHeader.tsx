import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/cn";

interface ShoppingHeaderProps {
  weekLabel: string;
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const navBtnClass =
  "bg-(--color-surface) border border-(--color-border) rounded-lg px-3 py-1.5 cursor-pointer text-xs font-semibold text-(--color-text-mid) hover:bg-(--color-surface-2) transition-colors flex items-center gap-1";

export default function ShoppingHeader({
  weekLabel,
  weekOffset,
  onPrev,
  onNext,
  onToday,
}: ShoppingHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-(--color-text)">
        <ShoppingCart size={22} className="text-(--color-primary)" />
        Indkøbsliste
      </h1>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} className={navBtnClass}>
          <ChevronLeft size={14} /> Forrige
        </button>
        <span className="text-sm font-semibold text-(--color-text-mid) min-w-35 text-center">
          {weekLabel}
        </span>
        <button type="button" onClick={onNext} className={navBtnClass}>
          Næste <ChevronRight size={14} />
        </button>
        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={onToday}
            className={cn(navBtnClass, "text-(--color-primary)")}
          >
            I dag
          </button>
        )}
      </div>
    </div>
  );
}
