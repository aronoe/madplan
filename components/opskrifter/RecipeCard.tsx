import type { Recipe } from "@/lib/types";
import RecipeImage from "@/components/ui/RecipeImage";
import { Clock, Users, Tag } from "lucide-react";
import { cn } from "@/lib/cn";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export default function RecipeCard({ recipe: r, onClick }: RecipeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        <h3 className="font-semibold text-(--color-text) text-base line-clamp-2 leading-snug mb-2">
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
      </div>
    </button>
  );
}
