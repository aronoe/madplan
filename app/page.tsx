import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import AutoPlanner from "@/components/AutoPlanner";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!userData?.family_id) redirect("/onboarding");

  return (
    <AppShell>
      <AutoPlanner familyId={userData.family_id} />
    </AppShell>
  );
}
