import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Settings, Database, ChevronRight, FlaskConical, Ruler, Languages } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    "";
  const email = user.email ?? "";
  const initial = ((displayName || email).charAt(0) || "U").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-(--color-text)">Profil</h1>

      {/* ── Bruger ── */}
      <section className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-(--color-border) flex items-center gap-2">
          <User size={15} className="text-(--color-text-muted)" />
          <h2 className="text-sm font-semibold text-(--color-text-muted) uppercase tracking-wider">Bruger</h2>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-(--color-primary) text-white flex items-center justify-center text-lg font-bold shrink-0">
            {initial}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            {displayName && (
              <span className="text-base font-semibold text-(--color-text) truncate">{displayName}</span>
            )}
            <span className="text-sm text-(--color-text-muted) truncate">{email}</span>
          </div>
        </div>
        <div className="px-5 pb-4">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-(--color-danger) hover:underline underline-offset-2 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Log ud
            </button>
          </form>
        </div>
      </section>

      {/* ── Indstillinger ── */}
      <section className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-(--color-border) flex items-center gap-2">
          <Settings size={15} className="text-(--color-text-muted)" />
          <h2 className="text-sm font-semibold text-(--color-text-muted) uppercase tracking-wider">Indstillinger</h2>
        </div>
        <div className="divide-y divide-(--color-border)">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <span className="text-sm text-(--color-text)">Sprog</span>
            <span className="text-sm text-(--color-text-muted)">Dansk</span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <span className="text-sm text-(--color-text)">Tema</span>
            <span className="text-sm text-(--color-text-muted)">Følger systemet</span>
          </div>
        </div>
      </section>

      {/* ── Administration ── */}
      <section className="bg-(--color-surface) border border-(--color-border) rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-(--color-border) flex items-center gap-2">
          <Database size={15} className="text-(--color-text-muted)" />
          <h2 className="text-sm font-semibold text-(--color-text-muted) uppercase tracking-wider">Administration</h2>
        </div>
        <p className="px-5 pt-3 pb-1 text-xs text-(--color-text-muted)">
          Administrer stamdata og app-opsætning.
        </p>
        <div className="divide-y divide-(--color-border)">
          {[
            { href: "/settings/ingredients", label: "Ingredienser", Icon: FlaskConical },
            { href: "/settings/units",       label: "Måleenheder",  Icon: Ruler },
            { href: "/settings/languages",   label: "Sprog",        Icon: Languages },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-(--color-surface-2) transition-colors group"
            >
              <Icon size={15} className="text-(--color-text-muted) shrink-0" />
              <span className="flex-1 text-sm text-(--color-text)">{label}</span>
              <ChevronRight size={14} className="text-(--color-text-muted) group-hover:text-(--color-text) transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
