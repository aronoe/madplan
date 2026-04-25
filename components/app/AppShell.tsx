import AppHeader from "./AppHeader";
import PageContainer from "./PageContainer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-(--color-page-bg) text-(--color-text)">
      <AppHeader />
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
