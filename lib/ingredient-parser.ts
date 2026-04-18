export interface ParsedIngredient {
  original: string;
  name: string;
  normalized_name: string; // lowercase, no parens, no " til …" suffix — NOT stored in DB
  amount: string;          // kept as string so "1½", "" etc. survive the review step
  unit: string;
  confidence: "high" | "medium" | "low";
}

// Longer tokens must appear before shorter ones so the regex alternation is
// greedy in the right direction (e.g. "spsk" wins over "s" if "s" were a unit).
const KNOWN_UNITS = [
  "knivspids", "spsk", "tsk", "dåse", "glas", "bundt", "pkt", "pk",
  "knsp", "nip", "stk", "fed", "kg", "ml", "dl", "g", "l",
];

// Build an alternation that accepts each unit with an optional trailing ".".
// After matching, the caller normalises with stripTrailingDot().
const UNIT_ALT_RE = KNOWN_UNITS.map((u) => u + "\\.?").join("|");

function stripTrailingDot(s: string): string {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}

function normalizeFractions(s: string): string {
  // Mixed fractions first: "1½" → "1.5", "2¼" → "2.25", "1¾" → "1.75"
  s = s.replace(/(\d+)\s*½/g, (_, n) => String(Number(n) + 0.5));
  s = s.replace(/(\d+)\s*¼/g, (_, n) => String(Number(n) + 0.25));
  s = s.replace(/(\d+)\s*¾/g, (_, n) => String(Number(n) + 0.75));
  // Standalone fractions
  s = s.replace(/½/g, "0.5");
  s = s.replace(/¼/g, "0.25");
  s = s.replace(/¾/g, "0.75");
  return s;
}

// For normalized_name: strip parenthetical notes, " til …" suffix, extra whitespace.
function computeNormalizedName(name: string): string {
  let base = name;
  // Trim everything from " til " onwards (e.g. "smør til stegning" → "smør")
  const tilIdx = base.indexOf(" til ");
  if (tilIdx !== -1) base = base.slice(0, tilIdx);
  return base
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTABLE_NAMES = new Set([
  "æg", "løg", "rødløg", "banan", "bananer", "citron", "citroner",
  "lime", "limer", "avocado", "avocadoer", "gulerod", "gulerødder",
  "kartoffel", "kartofler", "tomat", "tomater", "peberfrugt", "peberfrugter",
  "fed", "hvidløgsfed",
]);

export function parseIngredientLine(line: string): ParsedIngredient {
  const original = line.trim();
  if (!original) {
    return { original, name: "", normalized_name: "", amount: "", unit: "", confidence: "low" };
  }

  let working = original;
  let hadApprox = false;

  // Strip leading approximate qualifiers
  const approxRe = /^(ca\.?\s*|cirka\s*|omtrent\s*)/i;
  if (approxRe.test(working)) {
    working = working.replace(approxRe, "").trimStart();
    hadApprox = true;
  }

  // Normalize unicode fractions before decimal comma so "1½" → "1.5" first
  working = normalizeFractions(working);

  // Normalize decimal comma: "1,5" → "1.5"
  working = working.replace(/(\d),(\d)/g, "$1.$2");

  // Detect range at start ("2-3", "2 - 3") → low confidence, amount left empty
  const rangeRe = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*/;
  const rangeMatch = rangeRe.exec(working);
  if (rangeMatch) {
    const afterRange = working.slice(rangeMatch[0].length);
    const unitAfterRange = new RegExp(`^(${UNIT_ALT_RE})(?:\\s+|$)`, "i").exec(afterRange);
    const unit = unitAfterRange ? stripTrailingDot(unitAfterRange[1].toLowerCase()) : "";
    const nameRaw = unitAfterRange
      ? afterRange.slice(unitAfterRange[0].length).trim()
      : afterRange.trim();
    const name = nameRaw || original;
    return {
      original,
      name,
      normalized_name: computeNormalizedName(name),
      amount: "", // intentionally blank so the row is visible but not silently wrong
      unit,
      confidence: "low",
    };
  }

  // Pattern 1: [number] [known-unit] [name]
  const withUnitRe = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s+(${UNIT_ALT_RE})(?:\\s+(.+))?$`,
    "i",
  );
  const withUnitMatch = withUnitRe.exec(working);
  if (withUnitMatch) {
    const amount = withUnitMatch[1];
    const unit = stripTrailingDot(withUnitMatch[2].toLowerCase());
    const name = (withUnitMatch[3] ?? "").trim() || original;
    return {
      original,
      name,
      normalized_name: computeNormalizedName(name),
      amount,
      unit,
      confidence: hadApprox ? "medium" : "high",
    };
  }

  // Pattern 2: [number] [name] (no recognised unit)
  const noUnitRe = /^(\d+(?:\.\d+)?)\s+(.+)$/;
  const noUnitMatch = noUnitRe.exec(working);
  if (noUnitMatch) {
    const amount = noUnitMatch[1];
    const name = noUnitMatch[2].trim();
    const normalized = computeNormalizedName(name);
    const isCountable = COUNTABLE_NAMES.has(normalized);
    return {
      original,
      name,
      normalized_name: normalized,
      amount,
      unit: isCountable ? "stk" : "",
      confidence: isCountable ? "high" : "medium",
    };
  }

  // Fallback: name only (e.g. "salt", "peber") — amount is empty, confidence low
  return {
    original,
    name: original,
    normalized_name: computeNormalizedName(original),
    amount: "",
    unit: "",
    confidence: "low",
  };
}

export function parseIngredientLines(lines: string[]): ParsedIngredient[] {
  return lines.filter((l) => l.trim().length > 0).map(parseIngredientLine);
}
