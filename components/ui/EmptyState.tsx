import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon | string;
  message: string;
  className?: string;
}

export default function EmptyState({ icon: Icon, message, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-12 text-(--color-text-muted)", className)}>
      {Icon && typeof Icon === "string" ? (
        <span className="text-4xl">{Icon}</span>
      ) : Icon ? (
        <Icon size={40} strokeWidth={1.25} />
      ) : null}
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
