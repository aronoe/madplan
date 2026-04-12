"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  compact?: boolean;
  error?: string;
}

export default function Input({ label, compact = false, error, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const resolvedId = id ?? (label ? generatedId : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={resolvedId} className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
          {label}
        </label>
      )}
      <input
        id={resolvedId}
        {...props}
        className={cn(
          "w-full rounded-lg border bg-(--color-bg) text-(--color-text) placeholder:text-(--color-text-muted)",
          "border-(--color-border) focus:outline-none focus:border-(--color-border-focus) focus:ring-1 focus:ring-(--color-border-focus)",
          "transition-colors",
          compact ? "px-2 py-1 text-sm" : "px-3 py-2 text-sm",
          error && "border-(--color-danger)",
          className,
        )}
      />
      {error && <span className="text-xs text-(--color-danger)">{error}</span>}
    </div>
  );
}
