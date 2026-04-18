"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const EMOJIS = ["🍕","🍝","🌮","🍜","🥗","🍲","🥘","🍛","🥩","🐟","🍗","🥚","🫕","🍱","🥪","🫔","🌯","🍔","🌭","🥞"];

export const CATEGORIES = [
  "Dansk klassisk",
  "Italiensk inspireret",
  "Internationalt mix",
  "Supper og gryder",
  "Grill og ovn",
];

export const DEFAULT_FORM = {
  name: "",
  emoji: "🍕",
  time_minutes: 30,
  tags: "",
  category: "",
  servings: 4,
};

export type RecipeFormValues = typeof DEFAULT_FORM;

interface RecipeFormProps {
  form: RecipeFormValues;
  saving: boolean;
  error: string;
  onChange: (form: RecipeFormValues) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  hideSubmit?: boolean;
  // "inline" renders bare fields without the Card/form wrapper — for use inside the auto import flow
  variant?: "card" | "inline";
}

const labelClass = "block text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-1.5";
const selectClass = cn(
  "w-full rounded-lg border bg-(--color-bg) text-(--color-text)",
  "border-(--color-border) focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)",
  "px-3 py-2 text-sm transition-colors",
);

function RecipeFields({
  form,
  set,
}: {
  form: RecipeFormValues;
  set: (patch: Partial<RecipeFormValues>) => void;
}) {
  return (
    <>
      <div className="flex gap-3 items-start">
        <div>
          <label className={labelClass}>Emoji</label>
          <select
            value={form.emoji}
            onChange={(e) => set({ emoji: e.target.value })}
            className={cn(selectClass, "w-17.5 text-center text-xl px-1 py-1.5")}
          >
            {EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className={labelClass}>Navn *</label>
          <Input
            type="text"
            placeholder="f.eks. Spaghetti bolognese"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Tid (min)</label>
          <Input
            type="number"
            min={5}
            max={300}
            value={form.time_minutes}
            onChange={(e) => set({ time_minutes: Number(e.target.value) })}
            className="w-20"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass}>Kategori (valgfrit)</label>
          <select
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
            className={selectClass}
          >
            <option value="">— Ingen kategori —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Portioner</label>
          <Input
            type="number"
            min={1}
            max={20}
            value={form.servings}
            onChange={(e) => set({ servings: Number(e.target.value) })}
            className="w-20"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tags (kommasepareret, valgfrit)</label>
        <Input
          type="text"
          placeholder="f.eks. pasta, nem, vegetar"
          value={form.tags}
          onChange={(e) => set({ tags: e.target.value })}
        />
      </div>
    </>
  );
}

export default function RecipeForm({ form, saving, error, onChange, onSubmit, hideSubmit, variant = "card" }: RecipeFormProps) {
  const set = (patch: Partial<RecipeFormValues>) => onChange({ ...form, ...patch });

  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-4">
        <RecipeFields form={form} set={set} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-6">
      <Card padding="lg" className="flex flex-col gap-4">
        <div className="font-semibold text-(--color-text)">
          Tilføj opskrift
        </div>

        <RecipeFields form={form} set={set} />

        {!hideSubmit && error && <div className="text-(--color-danger) text-sm">{error}</div>}

        {!hideSubmit && (
          <Button type="submit" disabled={saving || !form.name.trim()} className="self-start">
            {saving ? "Gemmer…" : "Tilføj opskrift"}
          </Button>
        )}
      </Card>
    </form>
  );
}
