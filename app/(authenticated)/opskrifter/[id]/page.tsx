import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import OpskriftDetaljeKlient from "./OpskriftDetaljeKlient";

export default async function OpskriftDetaljePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users").select("family_id").eq("id", user!.id).single();

  // Verify the recipe belongs to this family
  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("family_id", userData!.family_id)
    .single();

  if (!recipe) notFound();

  return <OpskriftDetaljeKlient recipe={recipe} userId={user!.id} />;
}
