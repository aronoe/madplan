import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  active = false,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border bg-(--color-surface) shadow-sm transition-colors",
        "border-(--color-border)",
        active && "border-(--color-primary) ring-1 ring-(--color-primary)",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
