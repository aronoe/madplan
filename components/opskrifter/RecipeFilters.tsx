"use client";

import { cn } from "@/lib/cn";
import { CATEGORIES as RECIPE_CATEGORIES } from "@/components/opskrifter/RecipeForm";

const CATEGORIES = ["Alle", ...RECIPE_CATEGORIES];

interface RecipeFiltersProps {
  activeCategory: string;
  onCategoryChange: (v: string) => void;
}

export default function RecipeFilters({ activeCategory, onCategoryChange }: RecipeFiltersProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
          className={cn(
            "rounded-full px-3.5 py-1.5 font-semibold text-xs border cursor-pointer transition-colors",
            activeCategory === cat
              ? "bg-(--color-primary-subtle) text-(--color-primary-text) border-(--color-primary)"
              : "bg-(--color-bg) text-(--color-text-mid) border-(--color-border) hover:border-(--color-primary)",
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
