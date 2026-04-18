export interface ParsedIngredient {
  original: string;
  name: string;
  normalized_name: string; // lowercase, no parens — NOT stored in DB; reserved for future grouping
  amount: string;          // kept as string so "1½", "" etc. survive the review step
  unit: string;
  confidence: "high" | "medium" | "low";
}

// Longer tokens must come first so the regex alternation greedily picks e.g.
// "spsk" before "s" would (if "s" were a unit).
const KNOWN_UNITS = [
  "spsk", "tsk", "dåse", "glas", "bundt", "pkt", "pk",
  "stk", "fed", "kg", "ml", "dl", "g", "l",
];

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

function computeNormalizedName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

  // Detect range at start of string: "2-3", "2 - 3" → low confidence
  // (The user must enter a concrete amount before saving.)
  const rangeRe = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*/;
  const rangeMatch = rangeRe.exec(working);
  if (rangeMatch) {
    const afterRange = working.slice(rangeMatch[0].length);
    // Try to pull a unit from what follows the range
    const unitAlt = KNOWN_UNITS.join("|");
    const unitAfterRange = new RegExp(`^(${unitAlt})(?:\\s+|$)`, "i").exec(afterRange);
    const unit = unitAfterRange ? unitAfterRange[1].toLowerCase() : "";
    const nameRaw = unitAfterRange ? afterRange.slice(unitAfterRange[0].length).trim() : afterRange.trim();
    const name = nameRaw || original;
    return {
      original,
      name,
      normalized_name: computeNormalizedName(name),
      amount: "", // intentionally blank — user must fill before saving
      unit,
      confidence: "low",
    };
  }

  const unitAlt = KNOWN_UNITS.join("|");

  // Pattern 1: [number] [known-unit] [name]
  const withUnitRe = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s+(${unitAlt})(?:\\s+(.+))?$`,
    "i",
  );
  const withUnitMatch = withUnitRe.exec(working);
  if (withUnitMatch) {
    const amount = withUnitMatch[1];
    const unit = withUnitMatch[2].toLowerCase();
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
    return {
      original,
      name,
      normalized_name: computeNormalizedName(name),
      amount,
      unit: "",
      confidence: "medium",
    };
  }

  // Fallback: name only (e.g. "salt", "peber") — empty amount is valid (stored as 0)
  return {
    original,
    name: original,
    normalized_name: computeNormalizedName(original),
    amount: "",
    unit: "",
    confidence: "medium",
  };
}

export function parseIngredientLines(lines: string[]): ParsedIngredient[] {
  return lines.filter((l) => l.trim().length > 0).map(parseIngredientLine);
}
