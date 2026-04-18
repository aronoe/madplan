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
7. User clicks "Tilføj opskrift" → recipe + ingredients + steps saved atomically

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
  name: string;             // "hakket kalv og flæsk"
  normalized_name: string;  // "hakket kalv og flæsk" (lowercase, no parens)
  amount: string;           // "500", "1½", "2-3", "" — kept as string
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

**Image** (if `imageUrl`): small `<img>` thumbnail, `h-24 object-cover rounded-lg`

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

**`handleSubmit` extended:**
```typescript
// After addRecipe returns { id }:
const recipeId = newRecipe.id;

// Insert ingredients sequentially (preserve order)
for (const row of parsedIngredients) {
  await addIngredient(recipeId, {
    name: row.normalized_name || row.name,
    amount: parseFloat(row.amount.replace(",", ".")) || 0,
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

`amount` is stored as `string` in `ParsedIngredient` to preserve "1½", "2-3" etc. in the UI. The `recipe_ingredients.amount` DB column is numeric. On save: `parseFloat(row.amount.replace(",", ".")) || 0`.

This is intentionally simple — no fraction evaluation, no range averaging. "1½" → NaN → `0`, "2-3" → `2`. Users should correct these before saving (the confidence indicator signals which rows need attention). Future improvement: evaluate fraction strings properly.

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Network timeout (10s) | "Kunne ikke hente siden: timeout" |
| HTTP 4xx/5xx | "Kunne ikke hente siden: HTTP 404" |
| No JSON-LD Recipe found | "Ingen opskrift fundet på denne side." |
| Malformed JSON-LD | Parser skips that block, tries next |
| Ingredient save fails | Surface error in form, leave import state intact |

---

## Non-Goals (v1)

- No AI/NLP parsing
- No fraction evaluation ("1½" not converted to 1.5)
- No ingredient deduplication across recipes on import
- No step editing in preview panel
- No support for non-JSON-LD recipe sites (microdata, RDFa)
