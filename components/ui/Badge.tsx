import { cn } from "@/lib/cn";

type Variant = "tag" | "offer" | "meta";

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  tag:   "bg-(--color-primary-subtle) text-(--color-primary-text)",
  offer: "bg-(--color-primary-subtle) text-(--color-primary-text)",
  meta:  "bg-(--color-surface-2) text-(--color-text-muted)",
};

export default function Badge({ variant = "tag", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
