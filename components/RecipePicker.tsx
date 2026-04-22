"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Search, X, Tag } from "lucide-react";
import { CATEGORIES as RECIPE_CATEGORIES } from "@/components/opskrifter/RecipeForm";

const CATEGORIES = ["Alle", ...RECIPE_CATEGORIES];

type Props = {
  recipes: Recipe[];
  title?: string;
  offerCounts?: Record<string, number>;
  highlightedRecipeIds?: Set<string>;
  onSelect: (recipe: Recipe) => void;
  onClose: () => void;
};

export default function RecipePicker({
  recipes,
  title = "Vælg en opskrift",
  offerCounts = {},
  highlightedRecipeIds,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [onlyOffers, setOnlyOffers] = useState(false);

  const hasAnyOffers = Object.keys(offerCounts).length > 0;

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "Alle" || r.tags?.includes(category);
    const matchOffers = !onlyOffers || (offerCounts[r.id] ?? 0) > 0;
    return matchSearch && matchCategory && matchOffers;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:max-w-md bg-(--color-surface) rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-x-hidden overflow-y-auto max-h-[85vh] flex flex-col z-300">
        {/* Header */}
        <div className="px-5 pt-4.5 pb-3.5 border-b border-(--color-border) flex items-center justify-between shrink-0">
          <span className="font-extrabold text-base text-(--color-text)">
            {title}
          </span>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-(--color-text-muted) leading-none p-1 flex items-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
            <input
              type="text"
              autoFocus
              placeholder="Søg i opskrifter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm outline-none box-border focus:border-(--color-border-focus)"
            />
          </div>
        </div>

        {/* Category chips + offer filter */}
        <div className="px-5 pb-2.5 flex gap-1.5 flex-wrap shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "border rounded-full px-3 py-1 font-semibold text-xs cursor-pointer transition-colors",
                category === cat
                  ? "bg-(--color-primary-subtle) text-(--color-primary-text) border-(--color-primary)"
                  : "bg-(--color-bg) text-(--color-text-mid) border-(--color-border) hover:border-(--color-primary)",
              )}
            >
              {cat}
            </button>
          ))}
          {hasAnyOffers && (
            <button
              onClick={() => setOnlyOffers((v) => !v)}
              className={cn(
                "border rounded-full px-3 py-1 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1",
                onlyOffers
                  ? "bg-green-100 text-green-700 border-green-400"
                  : "bg-(--color-bg) text-(--color-text-mid) border-(--color-border) hover:border-green-400",
              )}
            >
              <Tag size={10} />
              Kun tilbud
            </button>
          )}
        </div>

        {/* Recipe list */}
        <div className="overflow-y-auto flex-1 px-3 pb-4 pt-1">
          {filtered.length === 0 ? (
            <div className="text-center text-(--color-text-muted) py-8 text-sm">
              Ingen opskrifter matcher din søgning.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((r) => {
                const matchCount = offerCounts[r.id] ?? 0;
                const highlighted = highlightedRecipeIds?.has(r.id) ?? false;
                return (
                  <button
                    key={r.id}
                    onClick={() => { onSelect(r); onClose(); }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 border-none rounded-[10px] cursor-pointer text-left w-full transition-colors",
                      highlighted
                        ? "bg-green-50 ring-1 ring-green-300 hover:bg-green-100"
                        : "bg-transparent hover:bg-(--color-active-bg)",
                    )}
                  >
                    <span className="text-[22px] shrink-0">{r.emoji}</span>
                    <span className="flex-1 text-sm font-semibold text-(--color-text)">
                      {r.name}
                    </span>
                    {matchCount > 0 && (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">
                        {matchCount} på tilbud
                      </span>
                    )}
                    {r.category && (
                      <span className="text-[11px] text-(--color-text-muted) whitespace-nowrap">
                        {r.category}
                      </span>
                    )}
                    <span className="text-xs text-(--color-text-muted) whitespace-nowrap shrink-0">
                      {r.time_minutes} min
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
