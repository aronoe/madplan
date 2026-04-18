# Recipe Import from URL — Design Spec
Date: 2026-04-18

## Goal
User pastes a recipe URL, clicks import, reviews and corrects parsed ingredients, then saves a fully structured recipe.

---

## Flow

```
[URL input] → [POST /api/recipe-import] → [ParsedRecipe] → [Review UI] → [Save]
```

1. User enters URL in "Tilføj via link" section on `/opskrifter`
2. Client POSTs to `/api/recipe-import`
3. Server fetches HTML, extracts JSON-LD, parses ingredients server-side
4. Client receives `ParsedRecipe` with structured `ParsedIngredient[]`
5. Form prefills (name, time, servings); review panel shows editable ingredients + steps
6. User corrects any low-confidence rows
7. User clicks "Tilføj opskrift" → recipe created first, then ingredients and steps inserted sequentially; any insertion error surfaces to the user without rolling back

---

## Types

### `ImportedRecipe` (internal, before parsing)
```typescript
interface ImportedRecipe {
  title: string;
  image_url: string | null;
  ingredients: string[];   // raw lines from JSON-LD
  steps: string[];
  servings: number | null;
  time_minutes: number | null;
}
```

### `ParsedIngredient` (returned by API, edited in UI, saved to DB)
```typescript
interface ParsedIngredient {
  original: string;         // "500 g hakket kalv og flæsk"
  name: string;             // "hakket kalv og flæsk" — display name, stored in DB
  normalized_name: string;  // "hakket kalv og flæsk" (lowercase, no parens) — NOT stored in DB; reserved for future grouping/search
  amount: string;           // "500", "1½", "2-3", "" — kept as string for UI editing
  unit: string;             // "g", "dl", "spsk", ""
  confidence: "high" | "medium" | "low";
}
```

### `ParsedRecipe` (API response shape)
```typescript
interface ParsedRecipe {
  title: string;
  image_url: string | null;
  ingredients: ParsedIngredient[];
  steps: string[];
  servings: number | null;
  time_minutes: number | null;
}
```

---

## Files

### `lib/ingredient-parser.ts` (new)

Pure function, no dependencies.

**`parseIngredientLine(line: string): ParsedIngredient`**

Pipeline:
1. Set `original = line`
2. Track `hadApprox = false`
3. Strip leading `ca.`, `ca `, `circa`, `omtrent` → set `hadApprox = true`
4. Normalize decimal comma: `1,5 → 1.5`
5. Regex match: `^(\d[\d.,/½¼¾\-]*(?:\s*[½¼¾])?)?\s*(<unit>)?\s*(.+)$`
   - Amount group: optional leading number + fraction chars + ranges
   - Unit group: one of the known unit tokens (word-boundary match)
   - Name: remainder
6. Compute `normalized_name`: lowercase, remove `(...)` blocks, collapse whitespace, trim
7. Confidence:
   - `high`: amount non-empty AND unit in known list AND no `ca.` prefix
   - `medium`: amount non-empty but no known unit, OR had `ca.` prefix, OR amount is a range (`2-3`)
   - `low`: amount is empty (name-only lines)

**Known units:** `g`, `kg`, `ml`, `dl`, `l`, `tsk`, `spsk`, `stk`, `fed`, `dåse`, `glas`, `bundt`, `pk`, `pkt`

**`parseIngredientLines(lines: string[]): ParsedIngredient[]`**

Maps `parseIngredientLine` over each non-empty line.

**Known limitations:**
- Name-first lines (`Mel, 2 spsk`) not handled — treated as low confidence
- Multi-part amounts (`2 + 1 dl`) not handled — low confidence
- Ranges (`2-3`) preserved as-is in `amount` string
- Parenthetical notes `(finthakket)` removed from `normalized_name` but kept in `name`
- Mixed fractions in middle of text (`1 stor ½ dl`) may fail
- English-language sites with different unit conventions will have lower accuracy

---

### `lib/recipe-import.ts` (new)

**`extractRecipeFromHtml(html: string): ImportedRecipe | null`**

1. Regex-find all `<script type="application/ld+json">` blocks
2. Parse JSON; handle `@graph` arrays
3. Find first object with `@type === "Recipe"` (or array including `"Recipe"`)
4. Extract:
   - `name` → title
   - `image` → normalize: string | `string[]` | `{ url }` → `string | null`
   - `recipeIngredient` → `string[]`
   - `recipeInstructions` → normalize: `string[]` | `HowToStep[]` | `HowToSection[]` → `string[]`
   - `recipeYield` → servings: string | number | array → `parseInt` first element
   - `totalTime` (fallback `cookTime`) → ISO 8601 `PT1H30M` → `parseIsoDuration()` → minutes
5. Returns `null` if no Recipe object found or JSON malformed

**`parseIsoDuration(iso: string): number | null`**

Matches `PT(?:(\d+)H)?(?:(\d+)M)?`, returns `hours * 60 + minutes`.

---

### `app/api/recipe-import/route.ts` (new)

```
POST /api/recipe-import
Body: { url: string }
Response: ParsedRecipe | { error: string }
```

1. Validate `url` present and non-empty
2. `fetch(url, { headers: { "User-Agent": "..." }, signal: AbortSignal.timeout(10000) })`
3. If HTTP error → return 500 with error message
4. `extractRecipeFromHtml(html)` → if null → return 422 `"Ingen opskrift fundet på denne side."`
5. `parseIngredientLines(raw.ingredients)` → replace raw strings with `ParsedIngredient[]`
6. Return `ParsedRecipe`

No authentication needed (public fetch). Runs as Next.js Route Handler.

---

### `components/opskrifter/RecipeImportSection.tsx` (new)

**Props:** `onImport(data: ParsedRecipe): void`

**Internal state:** `url`, `loading`, `error`

**UI:**
- Small section header: "Tilføj via link"
- URL `<input>` + "Importer" button (disabled while loading)
- Error message below input on failure
- No result display — calls `onImport` and lets parent handle

---

### `components/opskrifter/ImportPreviewPanel.tsx` (new)

**Props:**
```typescript
{
  imageUrl: string | null;
  ingredients: ParsedIngredient[];
  steps: string[];
  onChange(rows: ParsedIngredient[]): void;
}
```

**UI sections:**

**Image** (if `imageUrl`): small `<img>` thumbnail, `h-24 object-cover rounded-lg`. The image URL is not editable in this panel — it is saved automatically to the recipe after creation via `updateRecipe`. If import returned no image, none is shown and none is saved.

**Warning banner** (if any `confidence !== "high"`):
> "⚠️ X ingredienser skal tjekkes" — amber text, shown above table

**Ingredients table:**
| Mængde | Enhed | Ingrediens |
|--------|-------|------------|
| `<input type="text">` | `<input type="text">` | `<input type="text" required>` |

- Low/medium confidence rows: amber left border or dot indicator
- `onChange` fires on every field edit (update the row in the array)

**Steps list:**
- Read-only numbered list
- Truncated to 3 visible with "Vis alle" if > 3

---

### `OpskrifterKlient.tsx` — changes

**New state:**
```typescript
const [importedData, setImportedData] = useState<ParsedRecipe | null>(null);
const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([]);
```

**On import:**
```typescript
function handleImport(data: ParsedRecipe) {
  setImportedData(data);
  setParsedIngredients(data.ingredients);
  setForm({
    ...DEFAULT_FORM,
    name: data.title,
    time_minutes: data.time_minutes ?? DEFAULT_FORM.time_minutes,
    servings: data.servings ?? DEFAULT_FORM.servings,
    // image_url is not a RecipeFormValues field; stored separately after recipe creation
  });
  setShowForm(true);
}
```

**Layout when `showForm && importedData`:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <RecipeForm ... />
  <ImportPreviewPanel
    imageUrl={importedData.image_url}
    ingredients={parsedIngredients}
    steps={importedData.steps}
    onChange={setParsedIngredients}
  />
</div>
```

**Pre-save validation (ingredient amounts):**

Before calling `addRecipe`, validate all `parsedIngredients` rows:
- If `row.amount` is non-empty, `parseFloat(row.amount.replace(",", "."))` must produce a finite number.
- If any row fails: show validation error, block save, keep import state intact.
- Empty `amount` is allowed (ingredients with no quantity, e.g. "salt").

The "Tilføj opskrift" button is only enabled when all rows pass this check. Rows with unparseable amounts retain their amber confidence indicator as a hard block, not a cosmetic warning.

**`handleSubmit` extended:**
```typescript
// Validate amounts before touching the DB
const invalidRows = parsedIngredients.filter(
  (row) => row.amount !== "" && !isFinite(parseFloat(row.amount.replace(",", ".")))
);
if (invalidRows.length > 0) {
  setError(`Ret mængde-felterne markeret med advarsel før du gemmer.`);
  return;
}

// After addRecipe returns { id }:
const recipeId = newRecipe.id;

// If imported data includes an image URL, save it to the recipe immediately
if (importedData.image_url) {
  await updateRecipe(recipeId, { image_url: importedData.image_url });
}

// Insert ingredients sequentially (preserve sort order)
for (const row of parsedIngredients) {
  await addIngredient(recipeId, {
    name: row.name,                                      // display name — not normalized_name
    amount: row.amount === "" ? 0 : parseFloat(row.amount.replace(",", ".")),
    unit: row.unit,
  });
}

// Insert steps
for (let i = 0; i < importedData.steps.length; i++) {
  await addRecipeStep(recipeId, importedData.steps[i], i + 1);
}

// Clean up import state
setImportedData(null);
setParsedIngredients([]);
```

---

### `lib/queries.ts` — change

`addRecipe` returns the new recipe row:
```typescript
const { data, error } = await supabase
  .from("recipes")
  .insert({ family_id: familyId, created_by: createdBy, ...recipe })
  .select("id")
  .single();
if (error) throw error;
return data; // { id: string }
```

Backward-compatible: existing caller in `OpskrifterKlient.handleSubmit` ignores the return value.

---

## Amount Conversion on Save

`amount` is stored as `string` in `ParsedIngredient` to preserve original text ("1½", "2-3") in the UI for user review. The `recipe_ingredients.amount` DB column is numeric.

**Conversion rule on save:**
- Empty string → `0` (ingredient with no quantity)
- Non-empty string → `parseFloat(amount.replace(",", "."))` — must be finite, otherwise blocked

**User responsibility:** The confidence indicator (amber) on medium/low rows is a **required correction signal**, not cosmetic. Rows with non-parseable amounts block save entirely. The parser intentionally marks these rows medium/low so users see and fix them before committing.

"1½" will parse as `NaN` (not supported by `parseFloat`) → amber, blocks save. User must correct to `1.5` or `1` in the amount field before saving.

"2-3" will parse as `2` (parseFloat stops at `-`) → this is acceptable and amounts to choosing the lower bound. Rows with ranges are marked medium confidence so users are aware.

`normalized_name` is computed in the parser and included in `ParsedIngredient` for potential future use (ingredient grouping, deduplication). It is **not stored in the DB** in v1. The `ingredients.name` column always receives `row.name` (the display-friendly extracted name).

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Network timeout (10s) | "Kunne ikke hente siden: timeout" |
| HTTP 4xx/5xx | "Kunne ikke hente siden: HTTP 404" |
| No JSON-LD Recipe found | "Ingen opskrift fundet på denne side." |
| Malformed JSON-LD | Parser skips that block, tries next |
| Ingredient amount unparseable on save | Validation blocks save; user must correct the row | 
| Ingredient or step save fails mid-sequence | Surface error in form; recipe already created — user can retry or continue editing via recipe detail view |

---

## Non-Goals (v1)

- No AI/NLP parsing
- No fraction evaluation ("1½" not converted to 1.5)
- No ingredient deduplication across recipes on import
- No step editing in preview panel
- No support for non-JSON-LD recipe sites (microdata, RDFa)
