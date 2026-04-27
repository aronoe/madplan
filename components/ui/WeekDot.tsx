import { cn } from "@/lib/cn";
import type { MealStatus } from "@/lib/types";

type DotStatus = MealStatus | "empty";

const dotClass: Record<DotStatus, string> = {
  empty:     "bg-(--color-border) opacity-40",
  planned:   "bg-(--color-border)",
  cooking:   "bg-(--color-neutral-400)",
  completed: "bg-(--color-primary)",
};

export default function WeekDot({
  status,
  isToday,
  size = "sm",
}: {
  status: DotStatus;
  isToday?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "rounded-full shrink-0 transition-all duration-150",
        size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3",
        dotClass[status],
        isToday && status !== "empty" && "ring-1 ring-offset-1 ring-(--color-primary)/50",
      )}
    />
  );
}
