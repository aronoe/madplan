"use client";

import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";

interface RecipeImageProps {
  src?: string | null;
  alt?: string;
  /** Shown in the placeholder when no image is available */
  emoji?: string;
  className?: string;
}

/**
 * Renders a recipe image with a graceful fallback.
 * - When `src` is provided and loads: shows the image (object-cover).
 * - When `src` is absent or fails: shows the emoji if given, else UtensilsCrossed.
 */
export default function RecipeImage({
  src,
  alt = "",
  emoji,
  className,
}: RecipeImageProps) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  return (
    <div
      className={cn(
        "aspect-4/3 bg-(--color-surface-2) flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : emoji ? (
        <span className="text-6xl select-none" aria-hidden="true">
          {emoji}
        </span>
      ) : (
        <UtensilsCrossed
          size={36}
          strokeWidth={1.5}
          className="text-(--color-text-muted)"
        />
      )}
    </div>
  );
}
