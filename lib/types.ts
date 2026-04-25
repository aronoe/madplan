export type MealStatus = "planned" | "cooking" | "completed";

export interface BaseIngredient {
  id: string;
  name: string;
  default_unit: string;
}

// Flattened join: recipe_ingredients JOIN ingredients
export interface RecipeIngredient {
  id: string; // recipe_ingredients.id
  recipe_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
  sort_order: number;
  name: string; // from ingredients.name
  default_unit: string; // from ingredients.default_unit
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  time_minutes: number;
  family_id: string;
  created_by: string;
  tags: string[];
  category: string | null;
  servings: number | null;
  notes: string | null;
  image_url: string | null;
  is_favorite: boolean;
  queue_for_next_plan: boolean;
  queue_order: number | null;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  description: string;
  image_url: string | null;
  created_at: string;
}

export interface MealPlanEntry {
  family_id: string;
  week_start: string;
  day_of_week: number;
  recipe_id: string;
  recipe: Pick<Recipe, "id" | "name" | "emoji" | "time_minutes">;
}

export type WeekMeals = Record<
  number,
  Pick<Recipe, "id" | "name" | "emoji" | "time_minutes"> | null
>;

export interface StoreOffer {
  id: string;
  store: string | null;
  ingredient_id: string | null;
  product_name: string;
  normal_price: number | null;
  offer_price: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  created_at: string;
}
