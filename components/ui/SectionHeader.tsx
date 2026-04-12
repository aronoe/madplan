import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4;
}

export default function SectionHeader({ children, className, level = 1 }: SectionHeaderProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag className={cn("text-2xl font-extrabold text-(--color-text)", className)}>
      {children}
    </Tag>
  );
}
