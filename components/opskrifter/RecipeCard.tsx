"use client";

import type { Recipe } from "@/lib/types";
import RecipeImage from "@/components/ui/RecipeImage";
import { Clock, Users, Tag, Heart, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/cn";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite?: (id: string, value: boolean) => void;
  onToggleQueue?: (id: string, value: boolean) => void;
}

export default function RecipeCard({ recipe: r, onClick, onToggleFavorite, onToggleQueue }: RecipeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={cn(
        "group text-left w-full rounded-xl border border-(--color-border) bg-(--color-surface)",
        "shadow-sm hover:shadow-md hover:border-(--color-primary)",
        "transition-[box-shadow,border-color] duration-150",
        "overflow-hidden flex flex-col h-full cursor-pointer",
      )}
    >
      {/* Image / placeholder */}
      <RecipeImage src={r.image_url} alt={r.name} emoji={r.emoji} className="shrink-0" />

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-serif font-semibold text-(--color-text) text-base line-clamp-2 leading-snug mb-2">
          {r.name}
        </h3>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--color-text-muted)">
          <span className="flex items-center gap-1">
            <Clock size={13} /> {r.time_minutes} min
          </span>
          {r.servings && (
            <span className="flex items-center gap-1">
              <Users size={13} /> {r.servings} pers.
            </span>
          )}
          {r.category && (
            <span className="flex items-center gap-1">
              <Tag size={13} /> {r.category}
            </span>
          )}
        </div>

        {/* Tags */}
        {r.tags && r.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {r.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-(--color-surface-2) text-(--color-text-muted) rounded px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Preference toggles */}
        <div className="flex items-center gap-1 mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onToggleFavorite?.(r.id, !r.is_favorite)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
              r.is_favorite
                ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                : "text-(--color-text-muted) hover:text-rose-500 hover:bg-rose-50",
            )}
            aria-label={r.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
            title={r.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
          >
            <Heart size={13} fill={r.is_favorite ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() => onToggleQueue?.(r.id, !r.queue_for_next_plan)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
              r.queue_for_next_plan
                ? "text-(--color-primary) bg-(--color-primary)/10 hover:bg-(--color-primary)/20"
                : "text-(--color-text-muted) hover:text-(--color-primary) hover:bg-(--color-primary)/10",
            )}
            aria-label={r.queue_for_next_plan ? "Fjern fra næste plan" : "Sæt i kø til næste plan"}
            title={r.queue_for_next_plan ? "Fjern fra næste plan" : "Sæt i kø til næste plan"}
          >
            {r.queue_for_next_plan ? <BookmarkCheck size={13} /> : <BookmarkPlus size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
