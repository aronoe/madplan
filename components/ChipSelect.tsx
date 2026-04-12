"use client";

import { cn } from "@/lib/cn";

type ChipSelectProps = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export default function ChipSelect({ options, selected, onChange }: ChipSelectProps) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors",
              active
                ? "bg-(--color-primary) text-white border-(--color-primary)"
                : "bg-(--color-bg) text-(--color-text-mid) border-(--color-border) hover:border-(--color-primary) hover:text-(--color-primary)"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
