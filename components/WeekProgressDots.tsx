import { cn } from "@/lib/cn";
import type { MealStatus } from "@/lib/types";

type DotStatus = MealStatus | "empty";

const dotClass: Record<DotStatus, string> = {
  empty:     "bg-(--color-border) opacity-40",
  planned:   "bg-(--color-border)",
  cooking:   "bg-(--color-neutral-400)",
  completed: "bg-(--color-primary)",
};

export default function WeekProgressDots({
  days,
  selectedDay,
  total = 7,
}: {
  days: { day: number; status: MealStatus }[];
  selectedDay?: number;
  total?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, d) => {
        const entry = days.find((x) => x.day === d);
        const dotStatus: DotStatus = entry?.status ?? "empty";
        const isActive = selectedDay === d;
        return (
          <span
            key={d}
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-150",
              dotClass[dotStatus],
              isActive && "ring-1 ring-(--color-primary)/50",
            )}
          />
        );
      })}
    </div>
  );
}
