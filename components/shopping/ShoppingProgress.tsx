import { CheckCircle } from "lucide-react";

interface ShoppingProgressProps {
  total: number;
  bought: number;
  allDone: boolean;
  onClearChecked: () => void;
  hasChecked: boolean;
}

export default function ShoppingProgress({
  total,
  bought,
  allDone,
  onClearChecked,
  hasChecked,
}: ShoppingProgressProps) {
  return (
    <>
      <div className="mb-5">
        <div className="flex justify-between mb-1.5 text-[13px] text-(--color-text-mid)">
          <span>{bought} / {total} varer købt</span>
          {hasChecked && (
            <button
              type="button"
              onClick={onClearChecked}
              className="bg-transparent border-none text-(--color-text-muted) cursor-pointer text-xs p-0"
            >
              Nulstil
            </button>
          )}
        </div>
        <div className="h-1.5 bg-(--color-border) rounded-full overflow-hidden">
          <div
            className="h-full bg-(--color-primary) rounded-full transition-all"
            style={{ width: `${(bought / total) * 100}%` }}
          />
        </div>
      </div>

      {allDone && (
        <div className="bg-(--color-primary-subtle) text-(--color-primary-text) rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold mb-5">
          <CheckCircle size={18} className="text-(--color-primary)" />
          Alle varer er købt — god fornøjelse med madlavningen!
        </div>
      )}
    </>
  );
}
