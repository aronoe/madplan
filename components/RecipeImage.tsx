"use client";

import { cn } from "@/lib/cn";

const GRADIENTS = [
  "linear-gradient(135deg, #fef3c7, #fff7ed)",
  "linear-gradient(135deg, #d1fae5, #f0fdf4)",
  "linear-gradient(135deg, #e0f2fe, #eff6ff)",
  "linear-gradient(135deg, #ede9fe, #f5f3ff)",
  "linear-gradient(135deg, #fce7f3, #fdf2f8)",
  "linear-gradient(135deg, #ecfccb, #f7fee7)",
];

function placeholderGradient(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export default function RecipeImage({
  imageUrl,
  name,
  className,
}: {
  imageUrl?: string | null;
  name: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn("w-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn("w-full flex items-end", className)}
      style={{ background: placeholderGradient(name) }}
    >
      <span className="px-4 py-2.5 text-sm font-medium text-black/30 truncate leading-none">
        {name}
      </span>
    </div>
  );
}

// Compact variant for thumbnail slots — no text, just the gradient fill.
export function RecipeImageThumb({
  imageUrl,
  name,
  className,
}: {
  imageUrl?: string | null;
  name: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn("w-full h-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn("w-full h-full", className)}
      style={{ background: placeholderGradient(name) }}
    />
  );
}
