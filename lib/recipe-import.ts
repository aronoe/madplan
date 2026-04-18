export interface ImportedRecipe {
  title: string;
  image_url: string | null;
  ingredients: string[]; // raw lines from JSON-LD recipeIngredient
  steps: string[];
  servings: number | null;
  time_minutes: number | null;
}

// ISO 8601 duration "PT1H30M" → 90 minutes
function parseIsoDuration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  const hours = parseInt(m[1] ?? "0");
  const mins = parseInt(m[2] ?? "0");
  const total = hours * 60 + mins;
  return total > 0 ? total : null;
}

// image field may be a string, array of strings, or ImageObject {url}
function extractImage(image: unknown): string | null {
  if (typeof image === "string") return image.trim() || null;
  if (Array.isArray(image)) return extractImage(image[0]);
  if (image && typeof image === "object" && "url" in image) {
    return String((image as { url: unknown }).url).trim() || null;
  }
  return null;
}

// recipeInstructions may be string[], HowToStep[], or HowToSection[]
function extractSteps(instructions: unknown): string[] {
  if (!Array.isArray(instructions)) return [];
  return instructions
    .flatMap((item) => {
      if (typeof item === "string") return [item.trim()];
      if (!item || typeof item !== "object") return [];
      const obj = item as Record<string, unknown>;
      if (obj["@type"] === "HowToStep") {
        return [String(obj.text ?? obj.name ?? "").trim()];
      }
      if (obj["@type"] === "HowToSection") {
        return extractSteps(obj.itemListElement);
      }
      return [];
    })
    .filter(Boolean);
}

function normalizeRecipeJsonLd(data: Record<string, unknown>): ImportedRecipe {
  const ingredients = Array.isArray(data.recipeIngredient)
    ? (data.recipeIngredient as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];

  const steps = extractSteps(data.recipeInstructions);

  const yieldRaw = data.recipeYield;
  let servings: number | null = null;
  if (typeof yieldRaw === "number") {
    servings = yieldRaw;
  } else if (typeof yieldRaw === "string") {
    servings = parseInt(yieldRaw) || null;
  } else if (Array.isArray(yieldRaw)) {
    servings = parseInt(String(yieldRaw[0])) || null;
  }

  const timeRaw = data.totalTime ?? data.cookTime;
  const time_minutes =
    typeof timeRaw === "string" ? parseIsoDuration(timeRaw) : null;

  return {
    title: String(data.name ?? "").trim(),
    image_url: extractImage(data.image),
    ingredients,
    steps,
    servings,
    time_minutes,
  };
}

export function extractRecipeFromHtml(html: string): ImportedRecipe | null {
  const scriptRe =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    let json: unknown;
    try {
      json = JSON.parse(match[1]);
    } catch {
      continue; // skip malformed JSON-LD blocks
    }

    // Normalise to an array of candidate objects (@graph or bare single object)
    const candidates: unknown[] = Array.isArray((json as Record<string, unknown>)?.["@graph"])
      ? ((json as Record<string, unknown>)["@graph"] as unknown[])
      : [json];

    for (const item of candidates) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const type = record["@type"];
      if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
        return normalizeRecipeJsonLd(record);
      }
    }
  }

  return null;
}
