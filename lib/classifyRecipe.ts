export interface RecipeClassification {
  category: string;
  tags: string[];
}

// ── Category (first match wins, title only) ───────────────────────────────

const categoryRules: [RegExp, string][] = [
  [/suppe|dhal|dal|chili|gryde|bouillon|bisque|linse/i, "Supper og gryder"],
  [/pasta|risotto|spaghetti|lasagne|penne|tagliatelle|fettuccine|noodle|\bris\b/i, "Pasta og ris"],
  [/salat|bowl|poke|coleslaw/i, "Salater og lette retter"],
  [/ovn|bagt|gratin|tærte|quiche|roast/i, "Ovne-retter"],
];

// ── Tag rules ─────────────────────────────────────────────────────────────
// Patterns use \b word boundaries to prevent substring false positives.
// "dish" and "protein" tags are sorted before "practical" in the output.

const MAX_TAGS = 5;

interface TagRule {
  tag: string;
  patterns: RegExp[];
  group: "dish" | "protein" | "practical";
}

const tagRules: TagRule[] = [
  // Dish type — checked against full corpus
  { tag: "pasta",    group: "dish",     patterns: [/\bpasta\b/, /\bspaghetti\b/, /\bpenne\b/, /\btagliatelle\b/, /\blasagne\b/, /\bfettuccine\b/] },
  { tag: "ris",      group: "dish",     patterns: [/\bris\b/, /\brisotto\b/] },
  { tag: "suppe",    group: "dish",     patterns: [/\bsuppe\b/] },
  { tag: "gryderet", group: "dish",     patterns: [/\bgryde\b/, /\bgryderet\b/, /\bdhal\b/, /\bdal\b/, /\bchili\b/] },

  // Protein
  // \bkylling (prefix, no trailing \b) intentionally matches kyllingebryst, kyllingefilet, etc.
  { tag: "kylling",  group: "protein",  patterns: [/\bkylling/] },
  { tag: "oksekød",  group: "protein",  patterns: [/\boksekød\b/, /\bhakket kød\b/, /\bhakket oksekød\b/, /\bbøf\b/, /\boksesteg\b/, /\blammekød\b/] },
  { tag: "svinekød", group: "protein",  patterns: [/\bsvinekød\b/, /\bhakket svinekød\b/, /\bbacon\b/, /\bflæsk\b/, /\bkotelet\b/, /\bribben\b/] },
  // \blaks (prefix) matches laks, laksfilet, laksesteak, etc.
  { tag: "fisk",     group: "protein",  patterns: [/\bfisk\b/, /\blaks/, /\btorsk\b/, /\btun\b/, /\bmakrel\b/, /\brejer\b/, /\bfiskefilet\b/] },

  // Practical / taste
  { tag: "cremet",    group: "practical", patterns: [/\bcremet\b/, /\bfløde\b/, /\bcreme fraiche\b/] },
  { tag: "tomatsovs", group: "practical", patterns: [/\btomatsovs\b/, /\btomat\b/, /\bpassata\b/, /\bhakkede tomater\b/] },
];

// Vegetar: legumes must be present AND no meat/fish tag matched
const LEGUME_RE = /\b(bønner?|linser?|kikærter?|tofu|tempeh)\b/;
const MEAT_TAGS = new Set(["kylling", "oksekød", "svinekød", "fisk"]);

// ── Helpers ───────────────────────────────────────────────────────────────

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

// ── Public API ────────────────────────────────────────────────────────────

export function classifyRecipe(
  title: string,
  ingredientNames: string[] = [],
  description = "",
  timeMinutes?: number,
): RecipeClassification {
  const titleLower = title.toLowerCase();
  const ingredientCorpus = ingredientNames.join(" ").toLowerCase();
  const fullCorpus = [titleLower, ingredientCorpus, description.toLowerCase()].join(" ");

  // Category: matched on title only
  let category = "Hverdagsretter";
  for (const [pattern, cat] of categoryRules) {
    if (pattern.test(titleLower)) { category = cat; break; }
  }

  // Tags sorted by match location: title hits → ingredient hits → practical
  const titleGroup: string[] = [];
  const ingredientGroup: string[] = [];
  const practicalGroup: string[] = [];
  const seen = new Set<string>();

  for (const rule of tagRules) {
    if (seen.size >= MAX_TAGS) break;
    const inTitle = matchesAny(titleLower, rule.patterns);
    const inFull  = !inTitle && matchesAny(fullCorpus, rule.patterns);
    if (!inTitle && !inFull) continue;
    seen.add(rule.tag);
    if (rule.group === "practical") {
      practicalGroup.push(rule.tag);
    } else if (inTitle) {
      titleGroup.push(rule.tag);
    } else {
      ingredientGroup.push(rule.tag);
    }
  }

  // Vegetar: only when no meat/fish found and legumes present
  const hasMeat = [...seen].some((t) => MEAT_TAGS.has(t));
  if (!hasMeat && LEGUME_RE.test(fullCorpus) && seen.size < MAX_TAGS) {
    ingredientGroup.push("vegetar");
    seen.add("vegetar");
  }

  // hverdagsmad: only for quick recipes that got very few other tags
  if (timeMinutes !== undefined && timeMinutes <= 35 && seen.size < 2) {
    practicalGroup.push("hverdagsmad");
  }

  const tags = [...titleGroup, ...ingredientGroup, ...practicalGroup].slice(0, MAX_TAGS);

  if (process.env.NODE_ENV === "development") {
    console.log("[classifyRecipe]", { title, category, tags, titleGroup, ingredientGroup, practicalGroup });
  }

  return { category, tags };
}
