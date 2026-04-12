"use client";

import { useEffect, useState } from "react";
import { addRecipe, deleteRecipe, getRecipes } from "@/lib/queries";
import type { Recipe } from "@/lib/types";
import RecipeView from "@/components/RecipeView";
import RecipeForm, { DEFAULT_FORM, type RecipeFormValues } from "@/components/opskrifter/RecipeForm";
import RecipeFilters from "@/components/opskrifter/RecipeFilters";
import RecipeCard from "@/components/opskrifter/RecipeCard";
import SectionHeader from "@/components/ui/SectionHeader";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    getRecipes(familyId)
      .then((data) => setRecipes((data as Recipe[]) ?? []))
      .catch((err) => console.error("getRecipes fejl:", err))
      .finally(() => setLoading(false));
  }, [familyId]);

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Alle" || r.tags?.includes(activeCategory);
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
    } catch {
      setError("Kunne ikke gemme opskriften. Prøv igen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
    try {
      await deleteRecipe(id);
    } catch {
      setRecipes(((await getRecipes(familyId)) as Recipe[]) ?? []);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <SectionHeader>Opskrifter</SectionHeader>
      </div>

      <RecipeForm
        form={form}
        saving={saving}
        error={error}
        onChange={setForm}
        onSubmit={handleSubmit}
      />

      <RecipeFilters
        search={search}
        activeCategory={activeCategory}
        onSearchChange={setSearch}
        onCategoryChange={setActiveCategory}
      />

      {loading ? (
        <div className="text-(--color-text-muted) py-5">Henter opskrifter…</div>
      ) : filtered.length === 0 ? (
        <div className="text-(--color-text-muted) text-sm">
          {recipes.length === 0
            ? "Ingen opskrifter endnu. Tilføj din første ovenfor."
            : "Ingen opskrifter matcher din søgning."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              expanded={expandedId === r.id}
              onToggleExpand={() => setExpandedId((prev) => (prev === r.id ? null : r.id))}
              onView={() => setViewingRecipe(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      {viewingRecipe && (
        <RecipeView
          recipe={viewingRecipe}
          onClose={() => setViewingRecipe(null)}
          onEdit={() => {
            setExpandedId(viewingRecipe.id);
            setViewingRecipe(null);
          }}
        />
      )}

      {!loading && recipes.length > 0 && (
        <div className="text-(--color-text-muted) text-xs mt-4">
          Viser {filtered.length} af {recipes.length} opskrifter
        </div>
      )}
    </div>
  );
}
