"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import type { ParsedRecipe } from "@/app/api/recipe-import/route";

interface Props {
  onImport(data: ParsedRecipe): void;
}

export default function RecipeImportSection({ onImport }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recipe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ukendt fejl");
        return;
      }
      setUrl("");
      onImport(data as ParsedRecipe);
    } catch {
      setError("Netværksfejl. Tjek din forbindelse og prøv igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-(--color-text-muted)">
        Tilføj via link
      </span>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) pointer-events-none"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImport()}
            placeholder="https://…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary) transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="inline-flex items-center gap-1.5 bg-(--color-primary) text-white rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-(--color-primary-hover) disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Henter…" : "Importer"}
        </button>
      </div>
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
    </div>
  );
}
