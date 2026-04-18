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
import { Plus, ChevronUp } from "lucide-react";

// A row blocks saving when: amount is non-empty but unparseable, or confidence
// is "low" with no amount entered yet (e.g. an unresolved range like "2-3").
function isBlockingRow(row: ParsedIngredient): boolean {
  if (row.amount !== "" && !isFinite(parseFloat(row.amount.replace(",", ".")))) return true;
  if (row.confidence === "low" && row.amount === "") return true;
  return false;
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
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

  // Import state
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
    setShowForm(true);
    setError("");
  }

  function handleCloseForm() {
    setShowForm(false);
    setImportedData(null);
    setParsedIngredients([]);
    setForm(DEFAULT_FORM);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) return;

    // Validate imported ingredients before touching the DB
    if (importedData) {
      const blockingRows = parsedIngredients.filter(isBlockingRow);
      if (blockingRows.length > 0) {
        setError(
          `Ret ${blockingRows.length} ${blockingRows.length === 1 ? "ingrediens" : "ingredienser"} markeret med rød advarsel, og prøv igen.`,
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
        // Save image URL if the import provided one
        if (importedData.image_url) {
          await updateRecipe(newRecipe.id, { image_url: importedData.image_url });
        }

        // Insert ingredients in order
        for (const row of parsedIngredients) {
          await addIngredient(newRecipe.id, {
            name: row.name.trim() || row.original,
            amount: row.amount === "" ? 0 : parseFloat(row.amount.replace(",", ".")),
            unit: row.unit.trim(),
          });
        }

        // Insert steps in order
        for (let i = 0; i < importedData.steps.length; i++) {
          await addRecipeStep(newRecipe.id, importedData.steps[i], i + 1);
        }
      }

      setRecipes(((await getRecipes(familyId)) as Recipe[]) ?? []);
      setForm(DEFAULT_FORM);
      setImportedData(null);
      setParsedIngredients([]);
      setShowForm(false);
    } catch {
      setError("Kunne ikke gemme opskriften. Prøv igen.");
    } finally {
      setSaving(false);
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

      {/* Import section — shown when the form is closed */}
      {!showForm && <RecipeImportSection onImport={handleImport} />}

      {/* Add recipe form — normal or import-review layout */}
      {showForm && (
        importedData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecipeForm
              form={form}
              saving={saving}
              error={error}
              onChange={setForm}
              onSubmit={handleSubmit}
            />
            <ImportPreviewPanel
              imageUrl={importedData.image_url}
              ingredients={parsedIngredients}
              steps={importedData.steps}
              onChange={setParsedIngredients}
            />
          </div>
        ) : (
          <RecipeForm
            form={form}
            saving={saving}
            error={error}
            onChange={setForm}
            onSubmit={handleSubmit}
          />
        )
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
            setRecipes((prev) =>
              prev.map((r) => (r.id === id ? { ...r, image_url: url } : r)),
            );
            setViewingRecipe((prev) =>
              prev && prev.id === id ? { ...prev, image_url: url } : prev,
            );
          }}
        />
      )}
    </div>
  );
}
