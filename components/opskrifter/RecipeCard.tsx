"use client";

import type { Recipe } from "@/lib/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import RecipeImage from "@/components/ui/RecipeImage";
import RecipeIngredientEditor from "./RecipeIngredientEditor";
import { Carrot, BookOpen, Clock, Users, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface RecipeCardProps {
  recipe: Recipe;
  expanded: boolean;
  onToggleExpand: () => void;
  onView: () => void;
  onDelete: () => void;
}

export default function RecipeCard({
  recipe: r,
  expanded,
  onToggleExpand,
  onView,
  onDelete,
}: RecipeCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-(--color-surface) shadow-sm transition-colors overflow-hidden flex flex-col h-full",
        expanded
          ? "border-(--color-primary) ring-1 ring-(--color-primary)"
          : "border-(--color-border)",
      )}
    >
      {/* ── Image / placeholder ───────────────────────────────────────── */}
      <RecipeImage src={r.image_url} alt={r.name} emoji={r.emoji} className="shrink-0" />

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4">

        {/* Title */}
        <h3 className="font-semibold text-(--color-text) text-base line-clamp-2 leading-snug mb-2">
          {r.name}
        </h3>

        {/* Metadata row */}
        <div className="flex items-center gap-3 text-sm text-(--color-text-muted) mb-3">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {r.time_minutes} min
          </span>
          {r.servings && (
            <span className="flex items-center gap-1">
              <Users size={13} />
              {r.servings} pers.
            </span>
          )}
        </div>

        {/* Tags */}
        {r.tags && r.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {r.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {/* Push actions to bottom */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-(--color-border)">
          <Button variant="primary" size="sm" onClick={onView}>
            <BookOpen size={13} /> Vis
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            title={expanded ? "Skjul ingredienser" : "Rediger ingredienser"}
          >
            <Carrot size={13} />
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Slet opskrift"
            className="text-(--color-danger) hover:bg-(--color-danger-subtle)"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* ── Ingredient editor (inline expansion) ──────────────────────── */}
      {expanded && (
        <div className="px-4 pb-4">
          <RecipeIngredientEditor recipeId={r.id} />
        </div>
      )}
    </div>
  );
}
