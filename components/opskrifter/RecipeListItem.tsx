"use client";

import type { Recipe } from "@/lib/types";
import { Clock, Users, Tag, Heart, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/cn";

interface RecipeListItemProps {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite?: (id: string, value: boolean) => void;
  onToggleQueue?: (id: string, value: boolean) => void;
}

export default function RecipeListItem({
  recipe: r,
  onClick,
  onToggleFavorite,
  onToggleQueue,
}: RecipeListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer",
        "border-b border-(--color-border) last:border-b-0",
        "hover:bg-(--color-surface-2) transition-colors duration-100",
      )}
    >
      {/* Thumbnail */}
      <div className="w-9 h-9 rounded-lg bg-(--color-bg-subtle) flex items-center justify-center shrink-0 overflow-hidden text-xl leading-none">
        {r.image_url ? (
          <img src={r.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{r.emoji}</span>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-(--color-text) truncate leading-snug">
          {r.name}
        </p>
        <p className="flex items-center gap-2 text-xs text-(--color-text-muted) mt-0.5">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {r.time_minutes} min
          </span>
          {r.servings && (
            <span className="flex items-center gap-1">
              <Users size={11} />
              {r.servings}
            </span>
          )}
          {r.category && (
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {r.category}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onToggleFavorite?.(r.id, !r.is_favorite)}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer",
            r.is_favorite
              ? "text-rose-500"
              : "text-(--color-text-muted) hover:text-rose-500",
          )}
          aria-label={r.is_favorite ? "Fjern fra favoritter" : "Tilføj til favoritter"}
        >
          <Heart size={15} fill={r.is_favorite ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={() => onToggleQueue?.(r.id, !r.queue_for_next_plan)}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer",
            r.queue_for_next_plan
              ? "text-(--color-primary)"
              : "text-(--color-text-muted) hover:text-(--color-primary)",
          )}
          aria-label={
            r.queue_for_next_plan ? "Fjern fra næste plan" : "Sæt i kø til næste plan"
          }
        >
          {r.queue_for_next_plan ? (
            <BookmarkCheck size={15} />
          ) : (
            <BookmarkPlus size={15} />
          )}
        </button>
      </div>
    </div>
  );
}
