import { createClient } from "@/lib/supabase/server";
import OpskrifterKlient from "./OpskrifterKlient";

export default async function OpskrifterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users").select("family_id").eq("id", user!.id).single();

  return <OpskrifterKlient familyId={userData!.family_id} userId={user!.id} />;
}
