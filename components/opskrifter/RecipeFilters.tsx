"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES as RECIPE_CATEGORIES } from "@/components/opskrifter/RecipeForm";

const CATEGORIES = ["Alle", ...RECIPE_CATEGORIES];

interface RecipeFiltersProps {
  search: string;
  activeCategory: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
}

export default function RecipeFilters({ search, activeCategory, onSearchChange, onCategoryChange }: RecipeFiltersProps) {
  return (
    <>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) pointer-events-none" />
        <input
          type="text"
          placeholder="Søg i opskrifter…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border bg-(--color-bg) text-(--color-text) placeholder:text-(--color-text-muted)",
            "border-(--color-border) focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)",
            "px-3 py-2.5 pl-9 text-sm transition-colors",
          )}
        />
      </div>
      <div className="flex gap-1.5 flex-wrap mb-5">
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
    </>
  );
}
