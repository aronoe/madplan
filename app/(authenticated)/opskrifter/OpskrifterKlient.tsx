"use client";

import { useEffect, useState } from "react";
import { addRecipe, deleteRecipe, getRecipes } from "@/lib/queries";
import type { Recipe } from "@/lib/types";
import RecipeView from "@/components/RecipeView";
import RecipeForm, { DEFAULT_FORM, type RecipeFormValues } from "@/components/opskrifter/RecipeForm";
import RecipeFilters from "@/components/opskrifter/RecipeFilters";
import RecipeCard from "@/components/opskrifter/RecipeCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { Plus, ChevronUp } from "lucide-react";

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      await addRecipe(familyId, userId, {
        name: form.name.trim(),
        emoji: form.emoji,
        time_minutes: Number(form.time_minutes),
        tags,
        category: form.category.trim() || null,
        servings: form.servings ? Number(form.servings) : null,
      });
      setRecipes(((await getRecipes(familyId)) as Recipe[]) ?? []);
      setForm(DEFAULT_FORM);
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
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover)"
        >
          {showForm ? <ChevronUp size={15} /> : <Plus size={15} />}
          {showForm ? "Luk" : "Tilføj opskrift"}
        </button>
      </div>

      {/* Collapsible add-recipe form */}
      {showForm && (
        <RecipeForm
          form={form}
          saving={saving}
          error={error}
          onChange={setForm}
          onSubmit={handleSubmit}
        />
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
