"use client";

import { useEffect, useState } from "react";
import {
  addIngredient,
  deleteIngredient,
  getIngredientsForRecipe,
  updateIngredient,
} from "@/lib/queries";
import type { RecipeIngredient } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

const DEFAULT_ING = { name: "", amount: 1, unit: "stk" };

const iconBtnClass = cn(
  "flex items-center justify-center w-6 h-6 rounded",
  "text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text) transition-colors",
);

export default function RecipeIngredientEditor({ recipeId }: { recipeId: string }) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState(DEFAULT_ING);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT_ING);

  useEffect(() => {
    getIngredientsForRecipe(recipeId)
      .then(setIngredients)
      .catch(() => setIngredients([]))
      .finally(() => setLoading(false));
  }, [recipeId]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      await addIngredient(recipeId, {
        name: addForm.name.trim(),
        amount: Number(addForm.amount),
        unit: addForm.unit.trim(),
      });
      setIngredients(await getIngredientsForRecipe(recipeId));
      setAddForm(DEFAULT_ING);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(ing: RecipeIngredient) {
    setEditId(ing.id);
    setEditForm({ name: ing.name, amount: ing.amount, unit: ing.unit });
  }

  async function handleSaveEdit(id: string) {
    await updateIngredient(id, {
      name: editForm.name.trim(),
      amount: Number(editForm.amount),
      unit: editForm.unit.trim(),
    });
    setIngredients((prev) =>
      (prev ?? []).map((i) =>
        i.id === id ? { ...i, ...editForm, amount: Number(editForm.amount) } : i,
      ),
    );
    setEditId(null);
  }

  async function handleDelete(id: string) {
    setIngredients((prev) => (prev ?? []).filter((i) => i.id !== id));
    await deleteIngredient(id);
  }

  if (loading) {
    return (
      <div className="py-2.5 text-(--color-text-muted) text-xs">
        Henter ingredienser…
      </div>
    );
  }

  return (
    <div className="border-t border-(--color-border) mt-2.5 pt-3">
      {/* Ingredient list */}
      {(ingredients ?? []).length === 0 ? (
        <div className="text-(--color-text-muted) text-xs mb-2.5">
          Ingen ingredienser endnu.
        </div>
      ) : (
        <div className="flex flex-col gap-1 mb-3">
          {(ingredients ?? []).map((ing) =>
            editId === ing.id ? (
              <div key={ing.id} className="flex gap-1.5 items-center">
                <Input compact value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="flex-1" placeholder="Navn" />
                <Input compact type="number" min={0} step="any" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-17.5" />
                <Input compact value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} className="w-17.5" placeholder="Enhed" />
                <button onClick={() => handleSaveEdit(ing.id)} className={iconBtnClass} title="Gem"><Check size={12} /></button>
                <button onClick={() => setEditId(null)} className={iconBtnClass} title="Annuller"><X size={12} /></button>
              </div>
            ) : (
              <div key={ing.id} className="flex items-center gap-2 py-1 border-b border-(--color-border)">
                <span className="flex-1 text-xs text-(--color-text)">{ing.name}</span>
                <span className="text-xs text-(--color-text-mid) whitespace-nowrap">
                  {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                </span>
                <button onClick={() => startEdit(ing)} className={iconBtnClass} title="Rediger"><Pencil size={12} /></button>
                <button onClick={() => handleDelete(ing.id)} className={iconBtnClass} title="Slet"><X size={12} /></button>
              </div>
            ),
          )}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-1.5 items-center flex-wrap">
        <Input compact placeholder="Ingrediens" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className="flex-1 min-w-30" required />
        <Input compact type="number" min={0} step="any" placeholder="Mængde" value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-20" />
        <Input compact placeholder="Enhed" value={addForm.unit} onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))} className="w-20" />
        <Button type="submit" size="sm" disabled={adding || !addForm.name.trim()}>
          {adding ? "…" : "+ Tilføj"}
        </Button>
      </form>
    </div>
  );
}
