"use client";

import type { Recipe } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeIngredientEditor from "./RecipeIngredientEditor";
import { Carrot, BookOpen } from "lucide-react";

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
    <Card active={expanded}>
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{r.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-(--color-text) text-sm">
            {r.name}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="meta">⏱ {r.time_minutes} min</Badge>
            {r.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onToggleExpand} title={expanded ? "Skjul ingredienser" : "Vis ingredienser"}>
          <Carrot size={14} /> Ingredienser {expanded ? "▲" : "▼"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onView}>
          <BookOpen size={14} /> Vis
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Slet
        </Button>
      </div>

      {/* Ingredient editor — only mounted when expanded */}
      {expanded && <RecipeIngredientEditor recipeId={r.id} />}
    </Card>
  );
}
