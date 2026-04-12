import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <h1 className={cn("text-2xl font-extrabold text-(--color-text)", className)}>
      {children}
    </h1>
  );
}
