import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Compute Monday of the current week as YYYY-MM-DD using Danish time (UTC+2).
// The server runs UTC; meals are stored from the browser with local Danish dates.
function getCurrentWeekStart(): string {
  const localNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const day = localNow.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(localNow.getTime() + diff * 86_400_000);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function EntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", user!.id)
    .single();

  if (userError || !userData?.family_id) {
    console.error("[EntryPage] failed to load family_id:", userError);
    redirect("/plan");
  }

  const weekStart = getCurrentWeekStart();

  // Fetch all rows for the week so we can log both total and planned counts.
  const { data, error } = await supabase
    .from("meal_plan")
    .select("recipe_id")
    .eq("family_id", userData!.family_id)
    .eq("week_start", weekStart);

  const totalRows = data?.length ?? 0;
  const plannedMealCount =
    data?.filter((r) => r.recipe_id != null).length ?? 0;

  console.log(
    "[EntryPage] weekStart:", weekStart,
    "| totalRows:", totalRows,
    "| plannedMealCount:", plannedMealCount,
    "| queryError:", error ?? null,
  );

  const target = plannedMealCount > 0 ? "/madplan" : "/plan";
  console.log("[EntryPage] redirect →", target);

  redirect(target);
}
