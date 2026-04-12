import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";

/**
 * Shared layout for all authenticated family pages.
 * Handles auth + family checks once — individual pages only fetch what they need.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!userData?.family_id) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
