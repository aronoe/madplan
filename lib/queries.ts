import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/types";

export function getWeekStart(offset = 0): string {
  const now = new Date();
  const day = now.getDay(); // local day of week
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  // Use local date fields — toISOString() would convert to UTC first, causing
  // off-by-one errors in UTC+ timezones around midnight.
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getMealPlan(familyId: string, weekStart: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meal_plan")
    .select("*, recipe:recipe_id(id, name, emoji, time_minutes)")
    .eq("family_id", familyId)
    .eq("week_start", weekStart);

  if (error) throw error;
  return data;
}

export async function setMeal(
  familyId: string,
  weekStart: string,
  dayOfWeek: number,
  recipeId: string,
) {
  const supabase = createClient();
  const { error } = await supabase.from("meal_plan").upsert(
    {
      family_id: familyId,
      week_start: weekStart,
      day_of_week: dayOfWeek,
      recipe_id: recipeId,
    },
    { onConflict: "family_id,week_start,day_of_week" },
  );

  if (error) throw error;
}

export async function clearMeal(
  familyId: string,
  weekStart: string,
  dayOfWeek: number,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("meal_plan")
    .delete()
    .eq("family_id", familyId)
    .eq("week_start", weekStart)
    .eq("day_of_week", dayOfWeek);

  if (error) throw error;
}

// Delete all meal_plan entries for a given week — used before re-saving an approved plan
export async function clearWeekMeals(familyId: string, weekStart: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("meal_plan")
    .delete()
    .eq("family_id", familyId)
    .eq("week_start", weekStart);

  if (error) throw error;
}

export async function getRecipes(familyId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("family_id", familyId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function getRecipe(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function addRecipe(
  familyId: string,
  createdBy: string,
  recipe: {
    name: string;
    emoji: string;
    time_minutes: number;
    tags: string[];
    category: string | null;
    servings: number | null;
  },
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("recipes")
    .insert({ family_id: familyId, created_by: createdBy, ...recipe });

  if (error) throw error;
}

export async function updateRecipe(
  id: string,
  fields: Partial<{
    name: string;
    emoji: string;
    time_minutes: number;
    tags: string[];
    category: string | null;
    servings: number | null;
    notes: string | null;
  }>,
) {
  const supabase = createClient();
  const { error } = await supabase.from("recipes").update(fields).eq("id", id);

  if (error) throw error;
}

export interface AggregatedIngredient {
  name: string;
  amount: number;
  unit: string;
}

export async function getIngredientsForMealPlan(
  familyId: string,
  weekStart: string,
): Promise<AggregatedIngredient[]> {
  const supabase = createClient();

  const { data: plan, error: planError } = await supabase
    .from("meal_plan")
    .select("recipe_id")
    .eq("family_id", familyId)
    .eq("week_start", weekStart)
    .not("recipe_id", "is", null);

  if (planError) throw planError;
  if (!plan || plan.length === 0) return [];

  const recipeIds = plan.map((p) => p.recipe_id).filter(Boolean) as string[];
  if (recipeIds.length === 0) return [];

  const { data: rows, error: ingError } = await supabase
    .from("recipe_ingredients")
    .select("amount, unit, ingredients(name)")
    .in("recipe_id", recipeIds);

  if (ingError) throw ingError;
  if (!rows) return [];

  const map = new Map<string, AggregatedIngredient>();
  for (const row of rows as unknown as Array<{
    amount: number;
    unit: string;
    ingredients: { name: string } | null;
  }>) {
    const name = row.ingredients?.name;
    if (!name) continue;
    const key = `${name.toLowerCase()}__${row.unit.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += row.amount;
    } else {
      map.set(key, { name, amount: row.amount, unit: row.unit });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "da"),
  );
}

export async function getRecipesWithIngredient(
  familyId: string,
  ingredientNames: string[],
): Promise<Recipe[]> {
  if (ingredientNames.length === 0) return [];
  const supabase = createClient();

  // Run one query per ingredient name and union results, scoring by match count
  const results = await Promise.all(
    ingredientNames.map((name) =>
      supabase
        .from("recipes")
        .select("*, recipe_ingredients!inner(ingredients!inner(name))")
        .eq("family_id", familyId)
        .ilike("recipe_ingredients.ingredients.name", `%${name}%`)
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as unknown as Recipe[];
        }),
    ),
  );

  // Count how many ingredient queries each recipe matched
  const scoreMap = new Map<string, { recipe: Recipe; score: number }>();
  for (const matches of results) {
    for (const recipe of matches) {
      const existing = scoreMap.get(recipe.id);
      if (existing) {
        existing.score += 1;
      } else {
        scoreMap.set(recipe.id, { recipe, score: 1 });
      }
    }
  }

  // Return sorted by score descending (most ingredient matches first)
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((e) => e.recipe);
}

export async function searchIngredients(
  familyId: string,
  query: string,
): Promise<string[]> {
  if (!query.trim()) return [];
  const supabase = createClient();

  // Get ingredient names used in this family's recipes
  const { data, error } = await supabase
    .from("ingredients")
    .select("name, recipe_ingredients!inner(recipe_id, recipes!inner(family_id))")
    .eq("recipe_ingredients.recipes.family_id", familyId)
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) throw error;

  // Deduplicate names
  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of (data ?? []) as unknown as Array<{ name: string }>) {
    const lower = row.name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      names.push(row.name);
    }
  }
  return names;
}

export async function deleteRecipe(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) throw error;
}

export async function getIngredientsForRecipe(
  recipeId: string,
): Promise<RecipeIngredient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      "id, recipe_id, ingredient_id, amount, unit, sort_order, ingredients(id, name, default_unit)",
    )
    .eq("recipe_id", recipeId)
    .order("sort_order");

  if (error) throw error;

  return (
    (
      data as unknown as Array<{
        id: string;
        recipe_id: string;
        ingredient_id: string;
        amount: number;
        unit: string;
        sort_order: number;
        ingredients: { id: string; name: string; default_unit: string } | null;
      }>
    )?.map((row) => ({
      id: row.id,
      recipe_id: row.recipe_id,
      ingredient_id: row.ingredient_id,
      amount: row.amount,
      unit: row.unit,
      sort_order: row.sort_order,
      name: row.ingredients?.name ?? "",
      default_unit: row.ingredients?.default_unit ?? "",
    })) ?? []
  );
}

export async function addIngredient(
  recipeId: string,
  ingredient: { name: string; amount: number; unit: string },
): Promise<void> {
  const supabase = createClient();

  const { data: ing, error: ingError } = await supabase
    .from("ingredients")
    .upsert({ name: ingredient.name }, { onConflict: "name" })
    .select("id")
    .single();

  if (ingError) throw ingError;

  const { error } = await supabase.from("recipe_ingredients").insert({
    recipe_id: recipeId,
    ingredient_id: ing.id,
    amount: ingredient.amount,
    unit: ingredient.unit,
  });

  if (error) throw error;
}

export async function updateIngredient(
  id: string,
  fields: { name: string; amount: number; unit: string },
): Promise<void> {
  const supabase = createClient();

  const { data: ing, error: ingError } = await supabase
    .from("ingredients")
    .upsert({ name: fields.name }, { onConflict: "name" })
    .select("id")
    .single();

  if (ingError) throw ingError;

  const { error } = await supabase
    .from("recipe_ingredients")
    .update({ ingredient_id: ing.id, amount: fields.amount, unit: fields.unit })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteIngredient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Recipe Steps ──────────────────────────────────────────────────────────────

export async function getRecipeSteps(recipeId: string): Promise<RecipeStep[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe_steps")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("step_number");

  if (error) throw error;
  return data ?? [];
}

export async function addRecipeStep(
  recipeId: string,
  description: string,
  stepNumber: number,
): Promise<RecipeStep> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe_steps")
    .insert({ recipe_id: recipeId, description, step_number: stepNumber })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecipeStep(
  id: string,
  fields: Partial<{
    description: string;
    step_number: number;
    image_url: string | null;
  }>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("recipe_steps")
    .update(fields)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteRecipeStep(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("recipe_steps").delete().eq("id", id);

  if (error) throw error;
}

export async function uploadStepImage(
  recipeId: string,
  stepId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${recipeId}/${stepId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
  return data.publicUrl;
}

// ── Family / Auth ─────────────────────────────────────────────────────────────

export async function getUserFamily(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("family_id, families(id, name, invite_code)")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function createFamily(userId: string, name: string) {
  const supabase = createClient();

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name })
    .select()
    .single();

  if (familyError) throw familyError;

  const { error: userError } = await supabase
    .from("users")
    .upsert({ id: userId, family_id: family.id, display_name: name });

  if (userError) throw userError;
  return family;
}

export async function joinFamily(
  userId: string,
  inviteCode: string,
  displayName: string,
) {
  const supabase = createClient();

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();

  if (familyError) throw new Error("Ugyldig invite-kode");

  const { error: userError } = await supabase
    .from("users")
    .upsert({ id: userId, family_id: family.id, display_name: displayName });

  if (userError) throw userError;
  return family;
}
