"use client";

import type { Recipe } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RecipeIngredientEditor from "./RecipeIngredientEditor";
import { Carrot, BookOpen, Clock, ChevronUp, ChevronDown } from "lucide-react";

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
        <span className="text-2xl shrink-0">{r.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-(--color-text) text-[15px] truncate">
            {r.name}
          </div>
          <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
            <Badge variant="meta"><Clock size={11} className="inline-block mr-0.5" />{r.time_minutes} min</Badge>
            {r.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onToggleExpand} title={expanded ? "Skjul ingredienser" : "Vis ingredienser"}>
          <Carrot size={14} />
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onView}>
          <BookOpen size={14} />
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
