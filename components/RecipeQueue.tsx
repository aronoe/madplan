"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getQueuedRecipes, setQueueOrder, updateRecipe } from "@/lib/queries";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ChevronUp, ChevronDown, X, ListOrdered } from "lucide-react";

export default function RecipeQueue({
  familyId,
  refreshKey = 0,
}: {
  familyId: string;
  refreshKey?: number;
}) {
  const [queue, setQueue] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQueuedRecipes(familyId)
      .then(async (recipes) => {
        if (cancelled) return;
        if (recipes.length > 0 && recipes.some((r) => r.queue_order === null)) {
          const updates = recipes.map((r, i) => ({ id: r.id, queue_order: i + 1 }));
          await setQueueOrder(updates);
          if (!cancelled) {
            setQueue(recipes.map((r, i) => ({ ...r, queue_order: i + 1 })));
          }
        } else {
          setQueue(recipes);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [familyId, refreshKey]);

  async function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= queue.length) return;

    const newQueue = [...queue];
    [newQueue[index], newQueue[target]] = [newQueue[target], newQueue[index]];
    const normalized = newQueue.map((r, i) => ({ ...r, queue_order: i + 1 }));
    setQueue(normalized);

    setSaving(true);
    try {
      await setQueueOrder(normalized.map((r) => ({ id: r.id, queue_order: r.queue_order! })));
    } catch {
      setQueue(queue);
    } finally {
      setSaving(false);
    }
  }

  async function removeFromQueue(recipe: Recipe) {
    const newQueue = queue
      .filter((r) => r.id !== recipe.id)
      .map((r, i) => ({ ...r, queue_order: i + 1 }));
    setQueue(newQueue);

    try {
      await updateRecipe(recipe.id, { queue_for_next_plan: false, queue_order: null });
      if (newQueue.length > 0) {
        await setQueueOrder(newQueue.map((r) => ({ id: r.id, queue_order: r.queue_order! })));
      }
    } catch {
      getQueuedRecipes(familyId).then(setQueue).catch(console.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ListOrdered size={15} className="text-(--color-primary) shrink-0" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-(--color-text-muted)">
          Næste autoplan kø
        </h2>
        {!loading && queue.length > 0 && (
          <span className="ml-auto text-xs font-bold bg-(--color-primary)/10 text-(--color-primary) rounded-full px-2 py-0.5">
            {queue.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-(--color-text-muted)">Henter…</p>
      ) : queue.length === 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-(--color-text-muted)">
            Ingen opskrifter i kø endnu — brug bogmærke-ikonet på en opskrift for at tilføje den.
          </p>
          <Link href="/opskrifter" className="text-sm font-medium text-(--color-primary) hover:underline">
            Gå til opskrifter →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {queue.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-(--color-bg) border border-(--color-border)"
              >
                <span className="w-5 text-xs font-bold text-(--color-text-muted) tabular-nums shrink-0 text-right">
                  {i + 1}.
                </span>
                <span className="text-lg leading-none shrink-0">{r.emoji}</span>
                <span className="flex-1 min-w-0 text-sm font-medium text-(--color-text) truncate">
                  {r.name}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(i, "up")}
                    disabled={i === 0 || saving}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      i === 0 || saving
                        ? "text-(--color-border) cursor-not-allowed"
                        : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) cursor-pointer",
                    )}
                    aria-label="Flyt op"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(i, "down")}
                    disabled={i === queue.length - 1 || saving}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      i === queue.length - 1 || saving
                        ? "text-(--color-border) cursor-not-allowed"
                        : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) cursor-pointer",
                    )}
                    aria-label="Flyt ned"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <div className="w-px h-4 bg-(--color-border) mx-0.5 shrink-0" />
                  <button
                    type="button"
                    onClick={() => removeFromQueue(r)}
                    disabled={saving}
                    className="p-1.5 rounded-lg text-(--color-text-muted) hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
                    aria-label="Fjern fra kø"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-(--color-text-muted)">
            Disse opskrifter bruges først ved næste autoplan.
          </p>
        </>
      )}
    </div>
  );
}
