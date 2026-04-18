"use client";

import { useState } from "react";
import {
  addIngredient,
  deleteIngredient,
  getIngredientsForRecipe,
  updateIngredient,
} from "@/lib/queries";
import type { RecipeIngredient } from "@/lib/types";
import Input from "@/components/ui/Input";
import { Pencil, Check, X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const DEFAULT_ING = { name: "", amount: 1, unit: "stk" };

const iconBtnClass = cn(
  "flex items-center justify-center w-6 h-6 rounded",
  "text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text) transition-colors",
);

interface Props {
  recipeId: string;
  /** Data already loaded by the parent — no fetch on mount. */
  initialIngredients: RecipeIngredient[];
  onIngredientsChange?: (ingredients: RecipeIngredient[]) => void;
}

export default function RecipeIngredientEditor({
  recipeId,
  initialIngredients,
  onIngredientsChange,
}: Props) {
  // Initialised from parent-provided data — no fetch needed.
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialIngredients);
  const [addForm, setAddForm] = useState(DEFAULT_ING);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT_ING);

  function notify(updated: RecipeIngredient[]) {
    setIngredients(updated);
    onIngredientsChange?.(updated);
  }

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
      // Refetch after add to get the server-assigned id and sort_order.
      const updated = await getIngredientsForRecipe(recipeId);
      notify(updated);
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
    const updated = ingredients.map((i) =>
      i.id === id ? { ...i, ...editForm, amount: Number(editForm.amount) } : i,
    );
    notify(updated);
    setEditId(null);
  }

  async function handleDelete(id: string) {
    const updated = ingredients.filter((i) => i.id !== id);
    notify(updated);
    await deleteIngredient(id);
  }

  return (
    <div className="border-t border-(--color-border) mt-2.5 pt-1">
      {/* Ingredient list */}
      {ingredients.length === 0 ? (
        <div className="text-(--color-text-muted) text-xs py-2.5">
          Ingen ingredienser endnu.
        </div>
      ) : (
        <div className="flex flex-col mb-1">
          {ingredients.map((ing) =>
            editId === ing.id ? (
              <div key={ing.id} className="flex gap-1.5 items-center py-2 border-b border-(--color-border)/50">
                <Input compact value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="flex-1" placeholder="Navn" />
                <Input compact type="number" min={0} step="any" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-17.5" />
                <Input compact value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} className="w-17.5" placeholder="Enhed" />
                <button type="button" onClick={() => handleSaveEdit(ing.id)} className={iconBtnClass} title="Gem" aria-label="Gem"><Check size={12} /></button>
                <button type="button" onClick={() => setEditId(null)} className={iconBtnClass} title="Annuller" aria-label="Annuller"><X size={12} /></button>
              </div>
            ) : (
              <div key={ing.id} className="flex items-center gap-2 py-2.5 border-b border-(--color-border)/50">
                <span className="flex-1 text-sm text-(--color-text)">{ing.name}</span>
                <span className="text-sm text-(--color-text-muted) tabular-nums whitespace-nowrap">
                  {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                </span>
                <button type="button" onClick={() => startEdit(ing)} className={iconBtnClass} title="Rediger" aria-label="Rediger"><Pencil size={12} /></button>
                <button type="button" onClick={() => handleDelete(ing.id)} className={iconBtnClass} title="Slet" aria-label="Slet"><X size={12} /></button>
              </div>
            ),
          )}
        </div>
      )}

      {/* Add row */}
      <form onSubmit={handleAdd} className="flex gap-1.5 items-center pt-2.5">
        <Input compact placeholder="Ingrediens" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className="flex-1" required />
        <Input compact type="number" min={0} step="any" placeholder="Mængde" value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-18" />
        <Input compact placeholder="Enhed" value={addForm.unit} onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))} className="w-18" />
        <button
          type="submit"
          disabled={adding || !addForm.name.trim()}
          className="inline-flex items-center gap-1 shrink-0 rounded-lg px-3 py-1 text-sm font-semibold bg-(--color-primary) text-white cursor-pointer hover:bg-(--color-primary-hover) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={13} />
          {adding ? "…" : "Tilføj"}
        </button>
      </form>
    </div>
  );
}
