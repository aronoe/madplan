import { createClient } from "@/lib/supabase/server";
import AutoPlanner from "@/app/AutoPlanner";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user!.id)
    .single();

  return <AutoPlanner familyId={userData!.family_id} />;
}
