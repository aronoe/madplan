import { createClient } from "@/lib/supabase/server";
import MadplanUge from "@/components/MadplanUge";

export default async function MadplanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users").select("family_id").eq("id", user!.id).single();

  return <MadplanUge familyId={userData!.family_id} />;
}
