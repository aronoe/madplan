import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeIngredient, RecipeStep, StoreOffer, MealStatus } from "@/lib/types";
import { aggregateIngredients } from "@/lib/ingredientUtils";

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

export function addWeeks(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n * 7);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
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
      status: "planned",
    },
    { onConflict: "family_id,week_start,day_of_week" },
  );

  if (error) throw error;
}

export async function setMealStatus(
  familyId: string,
  weekStart: string,
  dayOfWeek: number,
  status: MealStatus,
): Promise<void> {
  const res = await fetch("/api/meal-plan/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      family_id: familyId,
      week_start: weekStart,
      day_of_week: dayOfWeek,
      status,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const json = await res.json();
      detail = json.error ?? json.details ?? "";
    } catch {
      // ignore parse error
    }
    throw new Error(
      `[setMealStatus] API error ${res.status}${detail ? `: ${detail}` : ""}`,
    );
  }
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
): Promise<{ id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .insert({ family_id: familyId, created_by: createdBy, ...recipe })
    .select("id")
    .single();

  if (error) throw error;
  return data;
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
    image_url: string | null;
    is_favorite: boolean;
    queue_for_next_plan: boolean;
    queue_order: number | null;
  }>,
  familyId?: string,
) {
  // Send the update through the internal Next.js API route instead of calling
  // Supabase REST directly from the browser — direct PATCH requests are
  // blocked by Supabase's CORS policy (PATCH not in Allow-Methods preflight).
  const res = await fetch(`/api/recipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ family_id: familyId, ...fields }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const json = await res.json();
      detail = json.error ?? json.details ?? "";
    } catch {
      // ignore parse error
    }
    throw new Error(
      `[updateRecipe] API error ${res.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const { data } = await res.json();
  return data;
}

export interface AggregatedIngredient {
  id: string;   // recipe_ingredient_id — unique per row, used as check key
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
    .select("id, amount, unit, ingredients(name)")
    .in("recipe_id", recipeIds);

  if (ingError) throw ingError;
  if (!rows) return [];

  const flatRows = (
    rows as unknown as Array<{
      id: string;
      amount: number;
      unit: string;
      ingredients: { name: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    name: row.ingredients?.name ?? "",
    amount: row.amount,
    unit: row.unit,
  }));

  return aggregateIngredients(flatRows);
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
    .select(
      "name, recipe_ingredients!inner(recipe_id, recipes!inner(family_id))",
    )
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

export async function getQueuedRecipes(familyId: string): Promise<Recipe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("family_id", familyId)
    .eq("queue_for_next_plan", true)
    .order("queue_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Recipe[];
}

export async function setQueueOrder(
  updates: { id: string; queue_order: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, queue_order }) => updateRecipe(id, { queue_order })),
  );
}

export async function getMealPlanSummaries(
  familyId: string,
  weekStarts: string[],
): Promise<Record<string, { day: number; status: MealStatus }[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meal_plan")
    .select("week_start, day_of_week, status")
    .eq("family_id", familyId)
    .in("week_start", weekStarts)
    .not("recipe_id", "is", null);
  if (error) throw error;
  const result: Record<string, { day: number; status: MealStatus }[]> = {};
  for (const ws of weekStarts) result[ws] = [];
  for (const row of (data ?? []) as { week_start: string; day_of_week: number; status: string | null }[]) {
    result[row.week_start].push({
      day: row.day_of_week,
      status: (row.status ?? "planned") as MealStatus,
    });
  }
  return result;
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

// Look up an ingredient by normalised name (case-insensitive).
// Creates a new row only if nothing matches.
async function getOrCreateIngredient(name: string): Promise<string> {
  const supabase = createClient();
  const normalised = name.toLowerCase().replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

  const { data: existing, error: lookupError } = await supabase
    .from("ingredients")
    .select("id")
    .ilike("name", normalised)
    .maybeSingle();

  if (lookupError) {
    console.error("[getOrCreateIngredient] lookup failed", { name, error: lookupError });
    throw lookupError;
  }

  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("ingredients")
    .insert({ name })
    .select("id")
    .single();

  if (insertError) {
    console.error("[getOrCreateIngredient] insert failed", { name, error: insertError });
    throw insertError;
  }

  return created.id;
}

export async function addIngredient(
  recipeId: string,
  ingredient: { name: string; amount: number; unit: string; sort_order?: number },
): Promise<void> {
  const ingredientId = await getOrCreateIngredient(ingredient.name);

  const supabase = createClient();
  const payload: Record<string, unknown> = {
    recipe_id: recipeId,
    ingredient_id: ingredientId,
    amount: ingredient.amount,
    unit: ingredient.unit,
  };
  if (ingredient.sort_order !== undefined) payload.sort_order = ingredient.sort_order;

  const { error } = await supabase.from("recipe_ingredients").insert(payload);

  if (error) {
    console.error("[addIngredient] insert failed", { recipeId, ingredient, error });
    throw error;
  }
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

// ── Shopping checked state ────────────────────────────────────────────────────

export async function getShoppingChecked(
  familyId: string,
  weekStart: string,
): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shopping_checked")
    .select("recipe_ingredient_id")
    .eq("family_id", familyId)
    .eq("week_start", weekStart)
    .not("recipe_ingredient_id", "is", null);
  if (error) throw error;
  return new Set(
    (data ?? []).map(
      (r: { recipe_ingredient_id: string }) => r.recipe_ingredient_id,
    ),
  );
}

export async function setShoppingItemChecked(
  familyId: string,
  weekStart: string,
  recipeIngredientId: string,
  checked: boolean,
): Promise<void> {
  console.log("toggle item", { id: recipeIngredientId, family_id: familyId, week_start: weekStart, checked });
  const supabase = createClient();
  if (checked) {
    const { error } = await supabase.from("shopping_checked").insert({
      family_id: familyId,
      week_start: weekStart,
      recipe_ingredient_id: recipeIngredientId,
    });
    if (error) {
      console.error("Insert failed", error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from("shopping_checked")
      .delete()
      .eq("family_id", familyId)
      .eq("week_start", weekStart)
      .eq("recipe_ingredient_id", recipeIngredientId);
    if (error) {
      console.error("Delete failed", error);
      throw error;
    }
  }
}

export async function clearShoppingChecked(
  familyId: string,
  weekStart: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("shopping_checked")
    .delete()
    .eq("family_id", familyId)
    .eq("week_start", weekStart);
  if (error) throw error;
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

// ── Store offers ──────────────────────────────────────────────────────────────

export async function getActiveOffers(): Promise<StoreOffer[]> {
  const supabase = createClient();
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data, error } = await supabase
    .from("store_offers")
    .select("*")
    .eq("is_active", true)
    .lte("valid_from", todayStr)
    .gte("valid_to", todayStr)
    .order("store")
    .order("product_name");

  if (error) throw error;
  return (data ?? []) as StoreOffer[];
}

// Returns offer match counts per recipe AND a per-ingredient → recipe[] map.
// Both are computed from a single DB query.
export async function getRecipeIngredientOverlap(
  recipeIds: string[],
  offerIngredientIds: string[],
): Promise<{
  counts: Record<string, number>;
  byIngredient: Record<string, string[]>;
}> {
  if (recipeIds.length === 0 || offerIngredientIds.length === 0) {
    return { counts: {}, byIngredient: {} };
  }
  const supabase = createClient();

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, ingredient_id")
    .in("recipe_id", recipeIds)
    .in("ingredient_id", offerIngredientIds);

  if (error) throw error;

  const counts: Record<string, number> = {};
  const byIngredient: Record<string, string[]> = {};
  for (const row of (data ?? []) as { recipe_id: string; ingredient_id: string }[]) {
    counts[row.recipe_id] = (counts[row.recipe_id] ?? 0) + 1;
    (byIngredient[row.ingredient_id] ??= []).push(row.recipe_id);
  }
  return { counts, byIngredient };
}
