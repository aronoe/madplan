"use client";

import { useState } from "react";
import MadplanUge from "@/components/MadplanUge";
import WeekOverview from "@/components/WeekOverview";
import RecipeQueue from "@/components/RecipeQueue";
import { cn } from "@/lib/cn";
import { CalendarDays, LayoutList } from "lucide-react";


type View = "uge" | "oversigt";

const TABS: { value: View; label: string; Icon: typeof CalendarDays }[] = [
  { value: "uge", label: "Uge", Icon: CalendarDays },
  { value: "oversigt", label: "Oversigt", Icon: LayoutList },
];

export default function MadplanLayout({
  familyId,
  initialWeekStart,
}: {
  familyId: string;
  initialWeekStart: string;
}) {
  const [view, setView] = useState<View>("uge");
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-(--color-bg-subtle) rounded-xl self-start">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              view === value
                ? "bg-(--color-bg) text-(--color-text) shadow-sm"
                : "text-(--color-text-muted) hover:text-(--color-text)",
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {view === "uge" ? (
        <MadplanUge familyId={familyId} initialWeekStart={initialWeekStart} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-(--color-text-muted)">
              Klik på en uge for at se og redigere den.
            </p>
            <WeekOverview
              familyId={familyId}
              onQueueChanged={() => setQueueRefreshKey((k) => k + 1)}
            />
          </div>
          <RecipeQueue familyId={familyId} refreshKey={queueRefreshKey} />
        </div>
      )}
    </div>
  );
}
