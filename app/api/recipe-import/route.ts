import type { NextRequest } from "next/server";
import { extractRecipeFromHtml } from "@/lib/recipe-import";
import { parseIngredientLines, type ParsedIngredient } from "@/lib/ingredient-parser";

export interface ParsedRecipe {
  title: string;
  image_url: string | null;
  ingredients: ParsedIngredient[];
  steps: string[];
  servings: number | null;
  time_minutes: number | null;
}

export async function POST(req: NextRequest) {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ugyldigt request-format" }, { status: 400 });
  }

  const url = body?.url;
  if (!url || typeof url !== "string" || !url.trim()) {
    return Response.json({ error: "URL mangler" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url.trim(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Madplan-RecipeImporter/1.0; +https://madplan.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `Kunne ikke hente siden: HTTP ${res.status}` },
        { status: 500 },
      );
    }
    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ukendt fejl";
    return Response.json(
      { error: `Kunne ikke hente siden: ${msg}` },
      { status: 500 },
    );
  }

  const raw = extractRecipeFromHtml(html);
  if (!raw) {
    return Response.json(
      {
        error:
          "Ingen opskrift fundet på denne side. Prøv en side med en struktureret opskrift.",
      },
      { status: 422 },
    );
  }

  const result: ParsedRecipe = {
    ...raw,
    ingredients: parseIngredientLines(raw.ingredients),
  };

  return Response.json(result);
}
