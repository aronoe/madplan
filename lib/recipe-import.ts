export interface ImportedRecipe {
  title: string;
  image_url: string | null;
  ingredients: string[]; // raw lines, passed to ingredient-parser
  steps: string[];
  servings: number | null;
  time_minutes: number | null;
}

// ── Shared utilities ──────────────────────────────────────────────────────────

// Remove <script> and <style> blocks before running microdata/HTML parsers.
// JSON-LD parser runs on the raw HTML so it can find ld+json scripts first.
function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
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

// Strip all HTML tags and decode common entities
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aelig;/gi, "æ")
    .replace(/&oslash;/gi, "ø")
    .replace(/&aring;/gi, "å")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract og:image meta tag value
function extractOgImage(html: string): string | null {
  const m =
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  return m ? m[1].trim() : null;
}

// Extract all <li> text values from an HTML chunk
function extractListItems(html: string): string[] {
  const results: string[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null) {
    const text = stripTags(m[1]);
    if (text) results.push(text);
  }
  return results;
}

// Headings that signal we've left the actual method and entered notes/tips/variations.
const NOISE_HEADING_RE =
  /^(tips?|note[rt]?|variante[rt]?|serveringsforslag|se også|prøv også|næringsindhold|nutrition)/i;

// Truncate an HTML chunk at the first heading that looks like a tips/notes section.
// Applied before step extraction so we don't mix instructions with advice text.
function truncateAtNoiseSection(html: string): string {
  // Match h2/h3/h4 and common subtitle-div patterns
  const headRe =
    /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>|<(?:div|span)[^>]*class="[^"]*(?:subtitle|label|heading|title)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/gi;
  let m: RegExpExecArray | null;
  while ((m = headRe.exec(html)) !== null) {
    const text = stripTags(m[1] ?? m[2] ?? "");
    if (NOISE_HEADING_RE.test(text)) {
      return html.slice(0, m.index);
    }
  }
  return html;
}

// Extract steps from a chunk: prefer <li> items, fall back to <p> tags.
// Always truncates at the first noise heading before extracting.
function extractStepsFromChunk(html: string): string[] {
  const clean = truncateAtNoiseSection(html);

  const liItems = extractListItems(clean).filter((t) => t.length > 5);
  if (liItems.length > 0) return liItems;

  const results: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(clean)) !== null) {
    const text = stripTags(m[1]);
    if (text.length > 10) results.push(text);
  }
  return results;
}

// ── Parser 1: JSON-LD ─────────────────────────────────────────────────────────

// image field may be a string, array of strings, or ImageObject {url}
function extractJsonLdImage(image: unknown): string | null {
  if (typeof image === "string") return image.trim() || null;
  if (Array.isArray(image)) return extractJsonLdImage(image[0]);
  if (image && typeof image === "object" && "url" in image) {
    return String((image as { url: unknown }).url).trim() || null;
  }
  return null;
}

// Score a single step text: positive for cooking verbs, negative for advice phrases.
// Used to filter tip-like sentences that slip into recipeInstructions JSON-LD.
function scoreStep(text: string): number {
  const cookVerbs =
    /\b(kog|smelt|hæld|rør|vend|steg|bland|skær|hak|pres|tilsæt|varm|bag|grill|sæt|tag|kom|lad|dræn|server|anret|rist|sauter|reducer|krydr|bring|cover|add|stir|heat|bake|fry|mix|pour|drain|season)\b/i;
  const advicePhrases =
    /^(tip[s:]|note[r:]|du kan\b|hvis du\b|det er også\b|prøv også\b|man kan\b)/i;
  let score = 0;
  if (cookVerbs.test(text)) score += 2;
  if (advicePhrases.test(text)) score -= 4;
  return score;
}

// recipeInstructions may be string[], HowToStep[], or HowToSection[]
function extractJsonLdSteps(instructions: unknown): string[] {
  if (!Array.isArray(instructions)) return [];
  const raw = instructions
    .flatMap((item) => {
      if (typeof item === "string") return [item.trim()];
      if (!item || typeof item !== "object") return [];
      const obj = item as Record<string, unknown>;
      if (obj["@type"] === "HowToStep") {
        return [String(obj.text ?? obj.name ?? "").trim()];
      }
      if (obj["@type"] === "HowToSection") {
        // Skip sections whose name matches noise keywords
        const sectionName = String(obj.name ?? "");
        if (NOISE_HEADING_RE.test(sectionName)) return [];
        return extractJsonLdSteps(obj.itemListElement);
      }
      return [];
    })
    .filter(Boolean);

  // Filter out items that are clearly advice/tip text, not cooking steps.
  // Keep everything if filtering would remove too many (avoids over-filtering short recipes).
  const filtered = raw.filter((s) => scoreStep(s) >= 0);
  return filtered.length >= Math.ceil(raw.length / 2) ? filtered : raw;
}

function normalizeRecipeJsonLd(data: Record<string, unknown>): ImportedRecipe {
  const ingredients = Array.isArray(data.recipeIngredient)
    ? (data.recipeIngredient as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];

  const steps = extractJsonLdSteps(data.recipeInstructions);

  const yieldRaw = data.recipeYield;
  let servings: number | null = null;
  if (typeof yieldRaw === "number") servings = yieldRaw;
  else if (typeof yieldRaw === "string") servings = parseInt(yieldRaw) || null;
  else if (Array.isArray(yieldRaw)) servings = parseInt(String(yieldRaw[0])) || null;

  const timeRaw = data.totalTime ?? data.cookTime;
  const time_minutes = typeof timeRaw === "string" ? parseIsoDuration(timeRaw) : null;

  return {
    title: String(data.name ?? "").trim(),
    image_url: extractJsonLdImage(data.image),
    ingredients,
    steps,
    servings,
    time_minutes,
  };
}

function parseJsonLd(html: string): ImportedRecipe | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    let json: unknown;
    try {
      json = JSON.parse(match[1]);
    } catch {
      console.log("[recipe-import] jsonld block failed JSON.parse — skipping");
      continue;
    }

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

// ── Parser 2: HTML microdata (itemprop) ───────────────────────────────────────
// Handles sites like Valdemarsro that embed schema.org microdata in HTML
// rather than (or in addition to) JSON-LD.

function parseMicrodata(html: string): ImportedRecipe | null {
  // Ingredients: <* itemprop="recipeIngredient">
  const ingredients: string[] = [];
  const ingRe = /itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = ingRe.exec(html)) !== null) {
    const text = stripTags(m[1]);
    if (text) ingredients.push(text);
  }

  // Steps: paragraph/item content inside the first [itemprop="recipeInstructions"] element
  const steps: string[] = [];
  const instrIdx = html.search(/itemprop=["']recipeInstructions["']/i);
  if (instrIdx !== -1) {
    // Grab a generous chunk starting from the marker — avoids needing a balanced tag parser
    const chunk = html.slice(instrIdx, instrIdx + 8000);
    steps.push(...extractStepsFromChunk(chunk));
  }

  if (ingredients.length === 0 || steps.length === 0) return null;

  const title = (() => {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    return h1 ? stripTags(h1[1]) : "";
  })();
  if (!title) return null;

  // Servings: itemprop="recipeYield"
  const yieldMatch = /itemprop=["']recipeYield["'][^>]*>([\s\S]*?)<\/[^>]+>/i.exec(html);
  const servings = yieldMatch ? parseInt(stripTags(yieldMatch[1])) || null : null;

  // Time: take the max of cookTime and totalTime — some sites label them inconsistently
  const cookTimeMatch = /itemprop=["']cookTime["'][^>]*>([^<]+)<\//i.exec(html);
  const totalTimeMatch = /itemprop=["']totalTime["'][^>]*>([^<]+)<\//i.exec(html);
  const cookMins = cookTimeMatch ? parseIsoDuration(cookTimeMatch[1].trim()) : null;
  const totalMins = totalTimeMatch ? parseIsoDuration(totalTimeMatch[1].trim()) : null;
  // Prefer the larger value — Valdemarsro has cookTime/totalTime swapped
  const time_minutes =
    cookMins !== null && totalMins !== null
      ? Math.max(cookMins, totalMins)
      : cookMins ?? totalMins;

  return {
    title,
    image_url: extractOgImage(html),
    ingredients,
    steps,
    servings,
    time_minutes,
  };
}

// ── Parser 3: heading-based HTML ──────────────────────────────────────────────
// Last resort for sites with no JSON-LD and no microdata.

// Return the HTML following the first heading-like element whose text matches keyword.
// Recognises <h2>/<h3>/<h4> and common div/span label patterns.
function sectionAfterHeading(html: string, keyword: RegExp): string | null {
  // Standard heading tags
  const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    if (keyword.test(stripTags(m[1]))) {
      return html.slice(m.index + m[0].length, m.index + m[0].length + 8000);
    }
  }

  // Div/span labels (e.g. <div class="subtitle">, <span class="section-title">)
  const labelRe =
    /<(?:div|span)[^>]*class="[^"]*(?:subtitle|label|heading|title)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/gi;
  while ((m = labelRe.exec(html)) !== null) {
    if (keyword.test(stripTags(m[1]))) {
      return html.slice(m.index + m[0].length, m.index + m[0].length + 8000);
    }
  }

  return null;
}

function parseHeadingHtml(html: string): ImportedRecipe | null {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = h1 ? stripTags(h1[1]) : "";
  if (!title) return null;

  const ingSection = sectionAfterHeading(html, /ingredienser/i);
  const ingredients = ingSection ? extractListItems(ingSection) : [];

  const stepsSection = sectionAfterHeading(html, /fremgangsmåde|tilberedning|sådan gør du/i);
  const steps = stepsSection ? extractStepsFromChunk(stepsSection) : [];

  if (ingredients.length === 0 || steps.length === 0) return null;

  const timeMatch =
    /tid[^<\d]{0,30}(\d+)\s*min/i.exec(html) ??
    /(\d+)\s*min(?:utter)?(?:\s|<)/i.exec(html);
  const time_minutes = timeMatch ? parseInt(timeMatch[1]) || null : null;

  const servingsMatch =
    /antal[^<\d]{0,30}(\d+)\s*pers/i.exec(html) ??
    /(\d+)\s*port(?:ion(?:er)?)?(?:\s|<)/i.exec(html);
  const servings = servingsMatch ? parseInt(servingsMatch[1]) || null : null;

  return { title, image_url: extractOgImage(html), ingredients, steps, servings, time_minutes };
}

// ── Public entry point ────────────────────────────────────────────────────────

export function extractRecipeFromHtml(html: string): ImportedRecipe | null {
  // Diagnostic: count ld+json blocks
  const ldBlocks = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length;
  console.log(`[recipe-import] html=${html.length} chars, ld+json blocks=${ldBlocks}`);

  function logResult(source: string, result: ImportedRecipe) {
    console.log(`[recipe-import] source=${source}`, {
      title: result.title,
      ingredients: result.ingredients.length,
      steps: result.steps.length,
      first2steps: result.steps.slice(0, 2),
    });
  }

  // 1. JSON-LD
  const jsonld = parseJsonLd(html);
  if (jsonld) { logResult("jsonld", jsonld); return jsonld; }
  console.log("[recipe-import] jsonld: no Recipe type found");

  // Strip scripts/styles once for the fallback parsers
  const cleanHtml = stripScriptsAndStyles(html);

  // 2. HTML microdata (itemprop)
  const microdata = parseMicrodata(cleanHtml);
  if (microdata) { logResult("microdata", microdata); return microdata; }
  console.log("[recipe-import] microdata: no recipeIngredient+recipeInstructions found");

  // 3. Heading-based HTML
  const headingHtml = parseHeadingHtml(cleanHtml);
  if (headingHtml) { logResult("html-headings", headingHtml); return headingHtml; }
  console.log("[recipe-import] source=none — all parsers failed");

  return null;
}
