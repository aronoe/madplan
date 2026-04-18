import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ShoppingListClient from "./ShoppingListClient";

export default async function ShoppingListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users").select("family_id").eq("id", user!.id).single();

  return (
    <Suspense>
      <ShoppingListClient familyId={userData!.family_id} />
    </Suspense>
  );
}
