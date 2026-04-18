import { createClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/queries";
import MadplanLayout from "@/components/MadplanLayout";

export default async function MadplanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users").select("family_id").eq("id", user!.id).single();

  const params = await searchParams;
  const weekParam = params.week;
  const initialWeekStart =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? weekParam
      : getWeekStart(0);

  return (
    <MadplanLayout
      familyId={userData!.family_id}
      initialWeekStart={initialWeekStart}
    />
  );
}
