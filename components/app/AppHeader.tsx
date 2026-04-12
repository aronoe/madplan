import { Salad } from "lucide-react";
import AppNav from "./AppNav";
import DarkModeToggle from "@/components/DarkModeToggle";

export default function AppHeader() {
  return (
    <header
      className="sticky top-0 z-40 w-full bg-(--color-nav-bg)"
      style={{ boxShadow: "var(--color-nav-shadow)" }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 text-(--color-primary) font-bold text-lg">
          <Salad size={22} />
          <span>Madplan</span>
        </div>

        {/* Navigation links — client component for active detection */}
        <div className="flex-1">
          <AppNav />
        </div>

        {/* Dark mode + sign out */}
        <div className="flex items-center gap-2 shrink-0">
          <DarkModeToggle />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs text-(--color-text-muted) hover:text-(--color-text) transition-colors px-2 py-1 rounded"
            >
              Log ud
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
