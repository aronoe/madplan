"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, BookOpen, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/madplan",       label: "Madplan",      Icon: CalendarDays },
  { href: "/opskrifter",    label: "Opskrifter",   Icon: BookOpen },
  { href: "/shopping-list", label: "Indkøbsliste", Icon: ShoppingCart },
];

export default function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex gap-1">
      {NAV_LINKS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <a
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
              active
                ? "bg-(--color-active-bg) text-(--color-text)"
                : "text-(--color-text-mid) hover:bg-(--color-surface-2)"
            )}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
