import Link from "next/link";
import { Salad } from "lucide-react";
import AppNav from "./AppNav";
import DarkModeToggle from "@/components/DarkModeToggle";
import { createClient } from "@/lib/supabase/server";

export default async function AppHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName: string =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email ??
    "";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 w-full bg-(--color-nav-bg)"
      style={{ boxShadow: "var(--color-nav-shadow)" }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 text-(--color-primary) font-bold text-lg"
        >
          <Salad size={28} />
        </Link>

        {/* Navigation links — client component for active detection */}
        <div className="flex-1">
          <AppNav />
        </div>

        {/* Dark mode + profile avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <DarkModeToggle />
          <Link
            href="/profile"
            aria-label="Profil"
            className="w-8 h-8 rounded-full bg-(--color-primary) text-white flex items-center justify-center text-sm font-bold hover:opacity-85 transition-opacity shrink-0"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
