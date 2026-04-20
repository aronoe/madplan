import Link from "next/link";
import { ChevronLeft, Languages } from "lucide-react";

export default function LanguagesSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-(--color-text-muted) hover:text-(--color-text) transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-(--color-text)">Sprog</h1>
      </div>

      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
        <Languages size={32} className="text-(--color-text-muted)" strokeWidth={1.5} />
        <p className="text-base font-semibold text-(--color-text)">Kommer snart</p>
        <p className="text-sm text-(--color-text-muted) max-w-xs">
          Her vil du kunne tilføje og administrere sprogindstillinger for appen.
        </p>
      </div>
    </div>
  );
}
