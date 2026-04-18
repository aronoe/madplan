"use client";

import { useEffect, useState } from "react";
import {
  addIngredient,
  addRecipe,
  addRecipeStep,
  deleteRecipe,
  getRecipes,
  updateRecipe,
} from "@/lib/queries";
import type { Recipe } from "@/lib/types";
import type { ParsedIngredient } from "@/lib/ingredient-parser";
import type { ParsedRecipe } from "@/app/api/recipe-import/route";
import RecipeView from "@/components/RecipeView";
import RecipeForm, { DEFAULT_FORM, type RecipeFormValues } from "@/components/opskrifter/RecipeForm";
import RecipeFilters from "@/components/opskrifter/RecipeFilters";
import RecipeCard from "@/components/opskrifter/RecipeCard";
import RecipeImportSection from "@/components/opskrifter/RecipeImportSection";
import ImportPreviewPanel from "@/components/opskrifter/ImportPreviewPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { Plus, ChevronUp } from "lucide-react";

function isBlockingRow(row: ParsedIngredient): boolean {
  return row.amount !== "" && !isFinite(parseFloat(row.amount.replace(",", ".")));
}

export default function OpskrifterKlient({
  familyId,
  userId,
}: {
  familyId: string;
  userId: string;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RecipeFormValues>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [showForm, setShowForm] = useState(false);
  const [createMode, setCreateMode] = useState<"auto" | "manual">("auto");
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

  const [importedData, setImportedData] = useState<ParsedRecipe | null>(null);
  const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([]);

  useEffect(() => {
    getRecipes(familyId)
      .then((data) => setRecipes((data as Recipe[]) ?? []))
      .catch((err) => console.error("getRecipes fejl:", err))
      .finally(() => setLoading(false));
  }, [familyId]);

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Alle" || r.category === activeCategory;
    return matchSearch && matchCategory;
  });

  function handleImport(data: ParsedRecipe) {
    setImportedData(data);
    setParsedIngredients(data.ingredients);
    setForm({
      ...DEFAULT_FORM,
      name: data.title,
      time_minutes: data.time_minutes ?? DEFAULT_FORM.time_minutes,
      servings: data.servings ?? DEFAULT_FORM.servings,
    });
    setError("");
  }

  function handleCloseForm() {
    setShowForm(false);
    setImportedData(null);
    setParsedIngredients([]);
    setForm(DEFAULT_FORM);
    setError("");
    setCreateMode("auto");
  }

  function switchMode(mode: "auto" | "manual") {
    setCreateMode(mode);
    setImportedData(null);
    setParsedIngredients([]);
    setError("");
  }

  async function doSave() {
    if (!form.name.trim()) return;

    if (importedData) {
      const blockingRows = parsedIngredients.filter(isBlockingRow);
      if (blockingRows.length > 0) {
        setError(
          `${blockingRows.length} ${blockingRows.length === 1 ? "ingrediens har" : "ingredienser har"} en ugyldig mængde — ret feltet og prøv igen.`,
        );
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const newRecipe = await addRecipe(familyId, userId, {
        name: form.name.trim(),
        emoji: form.emoji,
        time_minutes: Number(form.time_minutes),
        tags,
        category: form.category.trim() || null,
        servings: form.servings ? Number(form.servings) : null,
      });

      if (importedData) {
        if (importedData.image_url) {
          await updateRecipe(newRecipe.id, { image_url: importedData.image_url });
        }
        for (let i = 0; i < parsedIngredients.length; i++) {
          const row = parsedIngredients[i];
          await addIngredient(newRecipe.id, {
            name: row.name.trim() || row.original,
            amount: row.amount === "" ? 0 : parseFloat(row.amount.replace(",", ".")),
            unit: row.unit.trim(),
            sort_order: i + 1,
          });
        }
        for (let i = 0; i < importedData.steps.length; i++) {
          await addRecipeStep(newRecipe.id, importedData.steps[i], i + 1);
        }
      }

      setRecipes(((await getRecipes(familyId)) as Recipe[]) ?? []);
      setForm(DEFAULT_FORM);
      setImportedData(null);
      setParsedIngredients([]);
      setShowForm(false);
      setCreateMode("auto");
    } catch {
      setError("Kunne ikke gemme opskriften. Prøv igen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await doSave();
  }

  function updateRecipeInState(id: string, patch: Partial<Recipe>) {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setViewingRecipe((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  async function handleToggleFavorite(id: string, value: boolean) {
    updateRecipeInState(id, { is_favorite: value });
    try {
      await updateRecipe(id, { is_favorite: value });
    } catch {
      updateRecipeInState(id, { is_favorite: !value });
    }
  }

  async function handleToggleQueue(id: string, value: boolean) {
    updateRecipeInState(id, { queue_for_next_plan: value });
    try {
      await updateRecipe(id, { queue_for_next_plan: value });
    } catch {
      updateRecipeInState(id, { queue_for_next_plan: !value });
    }
  }

  async function handleDelete(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteRecipe(id);
    } catch {
      setRecipes(((await getRecipes(familyId)) as Recipe[]) ?? []);
    }
  }

  // True when we have a full imported recipe ready to review + save
  const showAutoReview = createMode === "auto" && importedData !== null;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <SectionHeader>Opskrifter</SectionHeader>
        <button
          type="button"
          onClick={showForm ? handleCloseForm : () => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover)"
        >
          {showForm ? <ChevronUp size={15} /> : <Plus size={15} />}
          {showForm ? "Luk" : "Tilføj opskrift"}
        </button>
      </div>

      {/* Create area */}
      {showForm && (
        <div className="flex flex-col gap-4">
          {/* Mode tabs — Auto is first and primary */}
          <div className="flex gap-1 p-1 bg-(--color-bg-subtle) rounded-lg self-start">
            {(["auto", "manual"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  createMode === mode
                    ? "bg-(--color-bg) text-(--color-text) shadow-sm"
                    : "text-(--color-text-muted) hover:text-(--color-text)"
                }`}
              >
                {mode === "auto" ? "Auto" : "Manuel"}
              </button>
            ))}
          </div>

          {/* ── Auto mode ── */}
          {createMode === "auto" && !importedData && (
            <RecipeImportSection onImport={handleImport} />
          )}

          {showAutoReview && (
            <>
              <Card padding="lg" className="flex flex-col gap-4">
                {/* Image at top */}
                {importedData!.image_url && (
                  <img
                    src={importedData!.image_url}
                    alt="Opskriftsbillede"
                    className="w-full h-48 object-cover rounded-xl -mt-1"
                  />
                )}

                {/* Inline fields (no card wrapper, no heading) */}
                <RecipeForm
                  form={form}
                  saving={saving}
                  error={error}
                  onChange={setForm}
                  onSubmit={handleSubmit}
                  variant="inline"
                />

                {/* Ingredients + steps */}
                <ImportPreviewPanel
                  imageUrl={null}
                  ingredients={parsedIngredients}
                  steps={importedData!.steps}
                  onChange={setParsedIngredients}
                />
              </Card>

              {/* Sticky CTA */}
              <div className="sticky bottom-0 z-10 bg-(--color-bg) border-t border-(--color-border) -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 flex gap-2">
                <button
                  type="button"
                  onClick={doSave}
                  disabled={saving || !form.name.trim()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center bg-(--color-primary) text-white rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Gemmer…" : "Gem opskrift"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="inline-flex items-center justify-center border border-(--color-border) text-(--color-text) rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-bg-subtle)"
                >
                  Annuller
                </button>
                {error && <p className="flex-1 text-sm text-(--color-danger) self-center">{error}</p>}
              </div>
            </>
          )}

          {/* ── Manuel mode ── */}
          {createMode === "manual" && (
            <RecipeForm
              form={form}
              saving={saving}
              error={error}
              onChange={setForm}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      )}

      {/* Search + filters */}
      <div>
        <RecipeFilters
          search={search}
          activeCategory={activeCategory}
          onSearchChange={setSearch}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {/* Recipe grid */}
      {loading ? (
        <div className="text-(--color-text-muted) text-sm py-5">Henter opskrifter…</div>
      ) : filtered.length === 0 ? (
        <div className="text-(--color-text-muted) text-sm py-5">
          {recipes.length === 0
            ? "Ingen opskrifter endnu — klik \"Tilføj opskrift\" for at komme i gang."
            : "Ingen opskrifter matcher din søgning."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onClick={() => setViewingRecipe(r)}
                onToggleFavorite={handleToggleFavorite}
                onToggleQueue={handleToggleQueue}
              />
            ))}
          </div>
          {recipes.length > 0 && (
            <p className="text-(--color-text-muted) text-xs mt-1">
              Viser {filtered.length} af {recipes.length} opskrifter
            </p>
          )}
        </>
      )}

      {/* Recipe detail modal */}
      {viewingRecipe && (
        <RecipeView
          recipe={viewingRecipe}
          onClose={() => setViewingRecipe(null)}
          onDelete={(id) => {
            handleDelete(id);
            setViewingRecipe(null);
          }}
          onImageChange={(id, url) => {
            updateRecipeInState(id, { image_url: url });
          }}
          onToggleFavorite={handleToggleFavorite}
          onToggleQueue={handleToggleQueue}
        />
      )}
    </div>
  );
}
