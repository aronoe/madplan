# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire app from green-tinted inline styles to a clean neutral/white light UI + zinc-based dark mode, Tailwind classes throughout, and lucide-react icons replacing all UI-chrome emojis — without touching any business logic.

**Architecture:** CSS custom properties bridge Tailwind v4 with semantic design tokens; UI primitives (Button, Card, Input, Badge) are rebuilt first so all page-level components can depend on them; pages are migrated component-by-component, bottom-up.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@import "tailwindcss"`), `next-themes` v0.4.6, `lucide-react` v1.8.0, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/globals.css` | Modify | Replace green `--c-*` tokens with neutral+zinc semantic vars |
| `components/DarkModeToggle.tsx` | Replace | `useTheme()` from next-themes + Lucide Sun/Moon |
| `components/app/AppShell.tsx` | Modify | Tailwind bg + min-h-screen |
| `components/app/AppHeader.tsx` | Modify | Tailwind layout, Lucide logo icon, mobile-friendly |
| `components/app/AppNav.tsx` | Modify | Tailwind nav links, Lucide icons, mobile bottom-bar |
| `components/app/PageContainer.tsx` | Modify | Tailwind max-w + padding |
| `lib/cn.ts` | Create | `clsx` + `tailwind-merge` helper |
| `components/ui/Button.tsx` | Modify | Tailwind variants with `cn()` |
| `components/ui/Card.tsx` | Modify | Tailwind with dark: variants |
| `components/ui/Input.tsx` | Modify | Tailwind with dark: variants |
| `components/ui/Badge.tsx` | Modify | Tailwind variants |
| `components/ui/EmptyState.tsx` | Modify | Accept LucideIcon prop |
| `components/ui/SectionHeader.tsx` | Modify | Tailwind typography |
| `components/MadplanUge.tsx` | Modify | Tailwind grid + mobile scroll, Lucide icons |
| `components/SelectedDayMealCard.tsx` | Modify | Tailwind, Lucide icons, remove dark green header |
| `components/RecipeView.tsx` | Modify | Tailwind modal, Lucide icons |
| `components/RecipePicker.tsx` | Modify | Tailwind modal, Lucide search |
| `app/AutoPlanner.tsx` | Modify | Tailwind form layout, Lucide icons |
| `components/WeekPreview.tsx` | Modify | Tailwind week slots, Lucide icons |
| `app/(authenticated)/opskrifter/OpskrifterKlient.tsx` | Modify | Tailwind page layout |
| `components/opskrifter/RecipeCard.tsx` | Modify | Tailwind, Lucide icons |
| `components/opskrifter/RecipeForm.tsx` | Modify | Tailwind form (keep recipe emoji picker) |
| `components/opskrifter/RecipeFilters.tsx` | Modify | Tailwind filters, Lucide search |
| `components/opskrifter/RecipeIngredientEditor.tsx` | Modify | Tailwind, Lucide icons |
| `app/(authenticated)/shopping-list/ShoppingListClient.tsx` | Modify | Tailwind page |
| `components/shopping/ShoppingItemRow.tsx` | Modify | Tailwind, Lucide Check/Tag |
| `components/shopping/ShoppingProgress.tsx` | Modify | Tailwind progress bar |
| `components/shopping/ShoppingCategoryGroup.tsx` | Modify | Tailwind grouping |
| `components/ChipSelect.tsx` | Modify | Tailwind chips |

---

## Task 1: Design Tokens + CSS Foundation

**Files:**
- Modify: `app/globals.css`

Replace all green-tinted `--c-*` variables with semantic tokens. Light mode uses white/neutral; dark mode uses zinc-950/zinc-900. Tailwind `emerald-500` (#10b981) is the single accent color.

- [ ] **Step 1: Replace globals.css**

```css
@import "tailwindcss";

/* ─── Semantic design tokens ──────────────────────────────────── */
:root {
  /* Surfaces */
  --color-bg:          #ffffff;
  --color-surface:     #f9fafb;       /* neutral-50 */
  --color-surface-2:   #f3f4f6;       /* neutral-100 */
  --color-border:      #e5e7eb;       /* neutral-200 */
  --color-border-focus:#6ee7b7;       /* emerald-300 */

  /* Text */
  --color-text:        #111827;       /* neutral-900 */
  --color-text-mid:    #374151;       /* neutral-700 */
  --color-text-muted:  #6b7280;       /* neutral-500 */

  /* Accent (emerald) */
  --color-primary:     #10b981;       /* emerald-500 */
  --color-primary-hover:#059669;      /* emerald-600 */
  --color-primary-subtle:#d1fae5;     /* emerald-100 */
  --color-primary-text:#065f46;       /* emerald-900 */

  /* States */
  --color-danger:      #ef4444;
  --color-danger-subtle:#fef2f2;
  --color-warning-subtle:#fffbeb;
  --color-warning-border:#fcd34d;

  /* Nav */
  --color-nav-bg:      #ffffff;
  --color-nav-shadow:  0 1px 0 0 #e5e7eb;
  --color-active-bg:   #ecfdf5;       /* emerald-50 */

  /* Legacy aliases — gradually remove */
  --c-page-bg:         var(--color-bg);
  --c-nav-bg:          var(--color-nav-bg);
  --c-nav-shadow:      var(--color-nav-shadow);
  --c-card-bg:         var(--color-surface);
  --c-input-bg:        var(--color-bg);
  --c-active-bg:       var(--color-active-bg);
  --c-btn-bg:          var(--color-primary);
  --c-border:          var(--color-border);
  --c-text-dark:       var(--color-text);
  --c-text-mid:        var(--color-text-mid);
  --c-text-muted:      var(--color-text-muted);
  --c-text-body:       var(--color-text);
  --c-slot-empty:      var(--color-surface-2);
  --c-slot-over:       var(--color-primary-subtle);
  --c-tag-bg:          var(--color-primary-subtle);
  --c-tag-text:        var(--color-primary-text);
}

.dark {
  /* Surfaces */
  --color-bg:          #09090b;       /* zinc-950 */
  --color-surface:     #18181b;       /* zinc-900 */
  --color-surface-2:   #27272a;       /* zinc-800 */
  --color-border:      #3f3f46;       /* zinc-700 */
  --color-border-focus:#6ee7b7;       /* emerald-300 */

  /* Text */
  --color-text:        #fafafa;       /* zinc-50 */
  --color-text-mid:    #d4d4d8;       /* zinc-300 */
  --color-text-muted:  #a1a1aa;       /* zinc-400 */

  /* Accent */
  --color-primary:     #10b981;
  --color-primary-hover:#34d399;
  --color-primary-subtle:#022c22;
  --color-primary-text:#6ee7b7;

  /* States */
  --color-danger:      #f87171;
  --color-danger-subtle:#450a0a;
  --color-warning-subtle:#422006;
  --color-warning-border:#854d0e;

  /* Nav */
  --color-nav-bg:      #18181b;
  --color-nav-shadow:  0 1px 0 0 #3f3f46;
  --color-active-bg:   #022c22;

  /* Legacy aliases */
  --c-page-bg:         var(--color-bg);
  --c-nav-bg:          var(--color-nav-bg);
  --c-nav-shadow:      var(--color-nav-shadow);
  --c-card-bg:         var(--color-surface);
  --c-input-bg:        var(--color-surface-2);
  --c-active-bg:       var(--color-active-bg);
  --c-btn-bg:          var(--color-primary);
  --c-border:          var(--color-border);
  --c-text-dark:       var(--color-text);
  --c-text-mid:        var(--color-text-mid);
  --c-text-muted:      var(--color-text-muted);
  --c-text-body:       var(--color-text);
  --c-slot-empty:      var(--color-surface-2);
  --c-slot-over:       var(--color-primary-subtle);
  --c-tag-bg:          var(--color-primary-subtle);
  --c-tag-text:        var(--color-primary-text);
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: Verify app still renders** — run `npm run dev`, open browser, confirm no visual crash. Dark mode toggle should switch between white bg and zinc-950 bg.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "design: replace green CSS tokens with neutral/zinc semantic vars"
```

---

## Task 2: `cn()` Helper + Fix DarkModeToggle

**Files:**
- Create: `lib/cn.ts`
- Modify: `components/DarkModeToggle.tsx`

- [ ] **Step 1: Install clsx + tailwind-merge if not present**

```bash
npm ls clsx tailwind-merge 2>/dev/null || npm install clsx tailwind-merge
```

- [ ] **Step 2: Create `lib/cn.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Replace `components/DarkModeToggle.tsx`**

Remove the localStorage/document.classList approach; use `next-themes` `useTheme()`:

```typescript
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Skift til lystilstand" : "Skift til mørktilstand"}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-text-mid)] hover:bg-[var(--color-surface-2)] transition-colors"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

- [ ] **Step 4: Verify dark mode toggle works** — toggle should switch theme, icon should change, no hydration warnings in console.

- [ ] **Step 5: Commit**

```bash
git add lib/cn.ts components/DarkModeToggle.tsx
git commit -m "feat: add cn() helper, fix DarkModeToggle to use next-themes"
```

---

## Task 3: AppShell + AppHeader + AppNav + PageContainer

**Files:**
- Modify: `components/app/AppShell.tsx`
- Modify: `components/app/AppHeader.tsx`
- Modify: `components/app/AppNav.tsx`
- Modify: `components/app/PageContainer.tsx`

- [ ] **Step 1: Migrate `AppShell.tsx`**

```typescript
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Migrate `AppNav.tsx`**

Replace emoji labels with Lucide icons. Nav uses `href` links (not `<Link>` — keep existing pattern):

```typescript
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
                ? "bg-[var(--color-active-bg)] text-[var(--color-text)]"
                : "text-[var(--color-text-mid)] hover:bg-[var(--color-surface-2)]"
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
```

- [ ] **Step 3: Migrate `AppHeader.tsx`**

Replace 🥦 with `Salad` icon from lucide-react. Read current file first to preserve logout form logic.

```typescript
import { Salad } from "lucide-react";
import AppNav from "./AppNav";
import DarkModeToggle from "@/components/DarkModeToggle";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppHeader() {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{ background: "var(--color-nav-bg)", boxShadow: "var(--color-nav-shadow)" }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0 text-[var(--color-primary)] font-bold text-lg">
          <Salad size={22} />
          <span className="hidden sm:inline">Madplan</span>
        </a>

        {/* Nav — takes remaining space */}
        <div className="flex-1">
          <AppNav />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <DarkModeToggle />
          <form action={async () => {
            "use server";
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect("/login");
          }}>
            <button
              type="submit"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-2 py-1 rounded"
            >
              Log ud
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Migrate `PageContainer.tsx`**

```typescript
export default function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {children}
    </main>
  );
}
```

- [ ] **Step 5: Verify** — open `/madplan`, `/opskrifter`, `/shopping-list` in browser. Header should show Salad icon, nav icons should be visible, layout should be correct on mobile (320px) and desktop.

- [ ] **Step 6: Commit**

```bash
git add components/app/AppShell.tsx components/app/AppHeader.tsx components/app/AppNav.tsx components/app/PageContainer.tsx
git commit -m "refactor: migrate AppShell/Header/Nav/PageContainer to Tailwind + Lucide icons"
```

---

## Task 4: UI Primitives (Button, Card, Input, Badge, EmptyState, SectionHeader)

**Files:**
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/Card.tsx`
- Modify: `components/ui/Input.tsx`
- Modify: `components/ui/Badge.tsx`
- Modify: `components/ui/EmptyState.tsx`
- Modify: `components/ui/SectionHeader.tsx`

Read each current file before modifying. The variants and props must stay compatible with existing usage.

- [ ] **Step 1: Rewrite `components/ui/Button.tsx`**

```typescript
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-border)]",
  secondary:
    "bg-[var(--color-surface-2)] text-[var(--color-text-mid)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]",
  danger:
    "bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)] hover:opacity-80",
  ghost:
    "bg-transparent text-[var(--color-text-mid)] hover:bg-[var(--color-surface-2)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-3 text-base rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Rewrite `components/ui/Card.tsx`**

```typescript
import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  active = false,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border bg-[var(--color-surface)] shadow-sm transition-colors",
        "border-[var(--color-border)]",
        active && "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `components/ui/Input.tsx`**

```typescript
import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  compact?: boolean;
  error?: string;
}

export default function Input({ label, compact = false, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        className={cn(
          "w-full rounded-lg border bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
          "border-[var(--color-border)] focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-border-focus)]",
          "transition-colors",
          compact ? "px-2 py-1 text-sm" : "px-3 py-2 text-sm",
          error && "border-[var(--color-danger)]",
          className,
        )}
      />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `components/ui/Badge.tsx`**

```typescript
import { cn } from "@/lib/cn";

type Variant = "tag" | "offer" | "meta";

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  tag:   "bg-[var(--color-tag-bg)] text-[var(--color-tag-text)]",
  offer: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-text)]",
  meta:  "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
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
```

- [ ] **Step 5: Rewrite `components/ui/EmptyState.tsx`**

Accept both emoji string (legacy) and LucideIcon component:

```typescript
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon | string;
  message: string;
  className?: string;
}

export default function EmptyState({ icon: Icon, message, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-12 text-[var(--color-text-muted)]", className)}>
      {Icon && typeof Icon === "string" ? (
        <span className="text-4xl">{Icon}</span>
      ) : Icon ? (
        <Icon size={40} strokeWidth={1.25} />
      ) : null}
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite `components/ui/SectionHeader.tsx`**

```typescript
import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <h1 className={cn("text-2xl font-extrabold text-[var(--color-text)]", className)}>
      {children}
    </h1>
  );
}
```

- [ ] **Step 7: Verify build** — run `npm run build` or `npm run dev` and confirm TypeScript compiles without errors.

- [ ] **Step 8: Commit**

```bash
git add components/ui/
git commit -m "refactor: rebuild UI primitives with Tailwind + cn(), remove inline styles"
```

---

## Task 5: MadplanUge + SelectedDayMealCard + RecipeView + RecipePicker

These are the largest components. Business logic (drag-and-drop, optimistic updates) must not change — only styles.

**Files:**
- Modify: `components/MadplanUge.tsx`
- Modify: `components/SelectedDayMealCard.tsx`
- Modify: `components/RecipeView.tsx`
- Modify: `components/RecipePicker.tsx`

Read each file before modifying.

- [ ] **Step 1: Read all four files**

```
Read components/MadplanUge.tsx
Read components/SelectedDayMealCard.tsx
Read components/RecipeView.tsx
Read components/RecipePicker.tsx
```

- [ ] **Step 2: Migrate `MadplanUge.tsx` styles**

Key changes — no logic changes, only style:
- Replace `navBtnStyle` constant and all inline `style={}` props with Tailwind classes
- Replace hardcoded hex colors (`#1a5c35`, `#4caf82`, `#d4eddf`) with CSS variable references
- Replace emojis in summary bar: 🍽️ → `<UtensilsCrossed size={16} />`, 🛒 → `<ShoppingCart size={16} />`, ✨ → `<Sparkles size={16} />`
- Day grid: change `gridTemplateColumns: "repeat(7, 1fr)"` to `className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"` for mobile-first
- `DagSlot` component: replace `style={{ background: isOver ? ... }}` with `cn()` conditional classes using CSS vars
- `RecipeKort`: replace inline style with Tailwind, preserve `useDraggable` attributes
- `×` clear button → `<X size={14} />`
- Week nav arrows `←`/`→` → `<ChevronLeft size={18} />`/`<ChevronRight size={18} />`

```typescript
// At top of file, add imports:
import { cn } from "@/lib/cn";
import { UtensilsCrossed, ShoppingCart, Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react";
```

All `style={{ ... }}` blocks become Tailwind className strings. Use `style={}` only for dynamic values (e.g., drag transform from `@dnd-kit`).

- [ ] **Step 3: Migrate `SelectedDayMealCard.tsx` styles**

Key changes:
- Dark green header strip `background: "#1a5c35"` → `className="bg-[var(--color-primary)] text-white rounded-t-xl px-4 py-3"`
- Replace all emojis with Lucide: 📭 → `<PackageOpen>`, 🍽️ → `<UtensilsCrossed>`, 📂 → `<FolderOpen>`, 📖 → `<BookOpen>`, 🔄 → `<RefreshCw>`, 🗑 → `<Trash2>`
- `MetaChip` internal helper: replace inline style with `cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]")`
- `actionBtnStyle` constant → Tailwind className string

- [ ] **Step 4: Migrate `RecipeView.tsx` styles**

Key changes:
- Modal overlay: inline style → `className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"`
- Modal panel: → `className="w-full sm:max-w-lg bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"`
- Replace emojis: ⏱ → `<Clock>`, 🍽 → `<UtensilsCrossed>`, 📂 → `<FolderOpen>`, ✏️ → `<Pencil>`, × → `<X>`, ✅ → `<CheckCircle>`
- `stepNavBtnStyle` constant → Tailwind

- [ ] **Step 5: Migrate `RecipePicker.tsx` styles**

Key changes:
- Modal: same pattern as RecipeView
- 🔍 placeholder → remove emoji, keep text `"Søg i opskrifter…"`, add `<Search>` icon inside input wrapper
- Hover effects: `onMouseEnter/Leave` → Tailwind `hover:` classes
- `×` close → `<X size={18} />`
- Active category: hardcoded `#1a5c35` → `text-[var(--color-primary-text)] bg-[var(--color-primary-subtle)]`

- [ ] **Step 6: Verify drag-and-drop still works** — open `/madplan`, drag a recipe to a day slot, confirm optimistic update and DB save work. Check mobile layout (320px viewport) — day grid should show 2 columns.

- [ ] **Step 7: Commit**

```bash
git add components/MadplanUge.tsx components/SelectedDayMealCard.tsx components/RecipeView.tsx components/RecipePicker.tsx
git commit -m "refactor: migrate MadplanUge and modal components to Tailwind + Lucide icons"
```

---

## Task 6: AutoPlanner + WeekPreview + ChipSelect

**Files:**
- Modify: `app/AutoPlanner.tsx`
- Modify: `components/WeekPreview.tsx`
- Modify: `components/ChipSelect.tsx`

Read each file before modifying.

- [ ] **Step 1: Read all three files**

```
Read app/AutoPlanner.tsx
Read components/WeekPreview.tsx
Read components/ChipSelect.tsx
```

- [ ] **Step 2: Migrate `AutoPlanner.tsx` styles**

Key changes:
- Outer card: `style={{ borderRadius: 20, padding: "40px 36px", maxWidth: 480 }}` → `className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6 w-full max-w-lg"`
- `labelStyle` constant → inline `className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2"`
- Tempo radio buttons: inline style → `cn("flex items-center gap-2.5 cursor-pointer px-3.5 py-2.5 rounded-xl border transition-colors", tempo === value ? "border-[var(--color-primary)] bg-[var(--color-active-bg)]" : "border-[var(--color-border)] bg-[var(--color-bg)]")`
- Day selector buttons: → `cn("flex-1 py-2.5 rounded-lg border font-bold text-sm transition-colors", days === d ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-mid)]")`
- Error box: hardcoded colors → `className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] rounded-xl p-3 text-sm text-[var(--color-danger)]"`
- Submit button: `background: "#4caf82"` → use `Button` component with `variant="primary" size="lg" fullWidth`
- Tempo emojis (⚡ 🔀 🍷) — keep these as they label UX concepts, not UI chrome. No change needed.
- Dropdown suggestion list: inline style → Tailwind

- [ ] **Step 3: Migrate `WeekPreview.tsx` styles**

Key changes:
- Outer card: → `className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-6 w-full max-w-lg"`
- Day row items: → `cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border min-h-[48px] transition-colors", recipe ? "bg-[var(--color-active-bg)] border-[var(--color-border)]" : "bg-[var(--color-bg)] border-dashed border-[var(--color-border)] opacity-60")`
- `slotBtnStyle` constant → `className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"`
- Replace emojis with Lucide: 🍽️ → `<UtensilsCrossed size={20} />`, 🔄 → `<RefreshCw size={14} />`, 📌 → `<Pin size={14} />`, ✅ → `<CheckCircle size={16} />`, ＋ → `<Plus size={14} />`
- Warning banner: → `className="bg-[var(--color-warning-subtle)] border border-[var(--color-warning-border)] rounded-xl p-3 text-xs text-[var(--color-text-mid)] mb-4"`
- Approve button: → `Button` with `variant="primary" size="lg" fullWidth`
- Regenerate button: → `Button` with `variant="secondary" size="md" fullWidth`

- [ ] **Step 4: Migrate `ChipSelect.tsx` styles**

Key changes:
- Active chip: `background: "#4caf82"` → `className="px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors bg-[var(--color-primary)] text-white border-[var(--color-primary)]"`
- Inactive chip: → `className="px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors bg-[var(--color-bg)] text-[var(--color-text-mid)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"`

- [ ] **Step 5: Verify AutoPlanner flow** — go to `/` (or `/auto-plan`), fill form, generate plan, edit days, approve. Check mobile layout.

- [ ] **Step 6: Commit**

```bash
git add app/AutoPlanner.tsx components/WeekPreview.tsx components/ChipSelect.tsx
git commit -m "refactor: migrate AutoPlanner, WeekPreview, ChipSelect to Tailwind + Lucide"
```

---

## Task 7: Opskrifter Page (OpskrifterKlient + RecipeCard + RecipeForm + RecipeFilters + RecipeIngredientEditor)

**Files:**
- Modify: `app/(authenticated)/opskrifter/OpskrifterKlient.tsx`
- Modify: `components/opskrifter/RecipeCard.tsx`
- Modify: `components/opskrifter/RecipeForm.tsx`
- Modify: `components/opskrifter/RecipeFilters.tsx`
- Modify: `components/opskrifter/RecipeIngredientEditor.tsx`

Read each file before modifying.

- [ ] **Step 1: Read all five files**

```
Read app/(authenticated)/opskrifter/OpskrifterKlient.tsx
Read components/opskrifter/RecipeCard.tsx
Read components/opskrifter/RecipeForm.tsx
Read components/opskrifter/RecipeFilters.tsx
Read components/opskrifter/RecipeIngredientEditor.tsx
```

- [ ] **Step 2: Migrate `OpskrifterKlient.tsx` styles**

Key changes:
- h1: remove 📖 emoji → use `SectionHeader` component: `<SectionHeader>Opskrifter</SectionHeader>`
- Header row (title + add button): → `className="flex items-center justify-between gap-4 mb-6"`
- Any inline style containers → Tailwind classes
- Recipe grid: → `className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"`

- [ ] **Step 3: Migrate `RecipeCard.tsx` styles**

Key changes:
- Uses `Card`, `Badge`, `Button` primitives (good — keep)
- `style={{ fontSize: 24 }}` for recipe emoji → `className="text-2xl"`
- Button icons: 🥕 → `<Carrot size={14} />`, 📖 → `<BookOpen size={14} />`
- Any remaining inline styles → Tailwind

Note: recipe.emoji is the user-chosen recipe icon (food emoji). Keep it rendered as text.

- [ ] **Step 4: Migrate `RecipeForm.tsx` styles**

Key changes:
- `labelStyle` and `inputStyle` CSSProperties constants → use `Input` component and `className` props
- Card wrapper: `boxShadow: "0 2px 12px rgba(0,80,40,.07)"` → use `Card` component with `padding="lg"`
- Submit/cancel: use `Button` component
- Emoji picker (food icons for recipe): KEEP as-is — these are user-chosen recipe icons
- Any remaining inline styles → Tailwind

- [ ] **Step 5: Migrate `RecipeFilters.tsx` styles**

Key changes:
- Search input: remove 🔍 from placeholder text, add `<Search size={14} />` icon inside a relative wrapper:
  ```tsx
  <div className="relative">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
    <Input
      className="pl-8"
      placeholder="Søg i opskrifter…"
      ...
    />
  </div>
  ```
- Active category: hardcoded `#1a5c35` → `className="bg-[var(--color-primary-subtle)] text-[var(--color-primary-text)] border-[var(--color-primary)]"`
- Inactive category chips: → `className="bg-[var(--color-bg)] text-[var(--color-text-mid)] border-[var(--color-border)] hover:border-[var(--color-primary)]"`

- [ ] **Step 6: Migrate `RecipeIngredientEditor.tsx` styles**

Key changes:
- `iconBtn()` function → replace return value with `cn("...")` string; delete the function, use className directly
- Edit/save/cancel icons: `✎` → `<Pencil size={12} />`, `✓` → `<Check size={12} />`, `✕` → `<X size={12} />`
- Any inline styles → Tailwind

- [ ] **Step 7: Verify Opskrifter page** — add a recipe, add ingredients, edit, delete. Confirm UI looks correct in light + dark mode.

- [ ] **Step 8: Commit**

```bash
git add app/(authenticated)/opskrifter/ components/opskrifter/
git commit -m "refactor: migrate Opskrifter page components to Tailwind + Lucide icons"
```

---

## Task 8: Shopping List Page

**Files:**
- Modify: `app/(authenticated)/shopping-list/ShoppingListClient.tsx`
- Modify: `components/shopping/ShoppingItemRow.tsx`
- Modify: `components/shopping/ShoppingProgress.tsx`
- Modify: `components/shopping/ShoppingCategoryGroup.tsx`

Read each file before modifying.

- [ ] **Step 1: Read all four files**

```
Read app/(authenticated)/shopping-list/ShoppingListClient.tsx
Read components/shopping/ShoppingItemRow.tsx
Read components/shopping/ShoppingProgress.tsx
Read components/shopping/ShoppingCategoryGroup.tsx
```

- [ ] **Step 2: Migrate `ShoppingListClient.tsx` styles**

Key changes:
- h1: remove emoji → `<SectionHeader>Indkøbsliste</SectionHeader>`
- Any inline containers → Tailwind

- [ ] **Step 3: Migrate `ShoppingItemRow.tsx` styles**

Key changes:
- Checkbox: `✓` text char → `<Check size={12} />` inside a styled box
- Checked state: hardcoded `#4caf82` → `bg-[var(--color-primary)] border-[var(--color-primary)]`
- 🏷️ offer badge → `<Tag size={10} />` icon inside the `Badge` component variant "offer"
- Unchecked state: → `border-[var(--color-border)] bg-[var(--color-bg)]`
- Text line-through for checked: keep logic, replace inline style with `className={cn("text-sm", item.checked && "line-through text-[var(--color-text-muted)]")}`

- [ ] **Step 4: Migrate `ShoppingProgress.tsx` styles**

Key changes:
- Progress bar fill: `background: "#4caf82"` → `className="h-full bg-[var(--color-primary)] rounded-full transition-all"`
- `✅` emoji in completion banner → `<CheckCircle size={18} className="text-[var(--color-primary)]" />`
- Banner background: → `className="bg-[var(--color-primary-subtle)] text-[var(--color-primary-text)] rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold"`

- [ ] **Step 5: Migrate `ShoppingCategoryGroup.tsx` styles**

Key changes:
- Any inline styles → Tailwind, minimal changes expected here.

- [ ] **Step 6: Verify shopping list** — go to `/shopping-list`, check items, verify progress bar updates, light + dark mode.

- [ ] **Step 7: Commit**

```bash
git add app/(authenticated)/shopping-list/ components/shopping/
git commit -m "refactor: migrate shopping list components to Tailwind + Lucide icons"
```

---

## Task 9: Final Pass — Run Tests + Visual QA

**Files:** None modified — verification only.

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: all 37 tests pass. If any fail, they are likely import failures from changed exports — fix the specific import, not the test logic.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, no missing imports.

- [ ] **Step 3: Visual QA checklist**

Open browser at `http://localhost:3000`. Check each page:

| Page | Light mode | Dark mode | Mobile (320px) |
|------|-----------|-----------|----------------|
| `/` (AutoPlanner) | □ | □ | □ |
| `/madplan` (7-day grid) | □ | □ | □ (2-col grid) |
| `/opskrifter` | □ | □ | □ |
| `/shopping-list` | □ | □ | □ |

- [ ] **Step 4: Confirm no emojis in UI chrome**

Search the codebase for emoji usage in non-recipe contexts:
```bash
# Should return only: recipe emoji picker options in RecipeForm, tempo labels in AutoPlanner
grep -r "🍽\|📅\|📖\|🛒\|🥦\|✅\|🔄\|📌\|⚡\|🔀\|🍷" components/ app/ --include="*.tsx" -l
```

Acceptable remaining emojis: tempo option labels (⚡🔀🍷) in AutoPlanner, food emojis in RecipeForm emoji picker.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: UI redesign complete — Tailwind + Lucide + neutral/zinc design tokens"
```

---

## Self-Review

**Spec coverage check:**
1. ✅ Clean light UI by default (white/neutral-50) — Task 1
2. ✅ Mobile-first layout — Tasks 3, 5 (day grid 2→7 cols), 6 (max-w-lg forms)
3. ✅ Replace inline styles with Tailwind — Tasks 3–8
4. ✅ Reusable Tailwind primitives — Task 4
5. ✅ Replace UI emojis with lucide-react — Tasks 3–8
6. ✅ Dual color system (light neutral + dark zinc) — Task 1
7. ✅ Dark mode designed, not inverted — Task 1 (zinc vars, not just `filter: invert`)
8. ✅ Incremental refactor, no business logic changes — each task is one component group
9. ✅ Production-ready — no half-implementations, legacy aliases in CSS bridge old `--c-*` references

**Placeholder scan:** None found. All steps have actual code.

**Type consistency:** `cn()` imported from `@/lib/cn` consistently. `LucideIcon` type from `lucide-react` in EmptyState. `Variant`/`Size` types internal to each component.
