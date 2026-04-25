// Route: PATCH /api/meal-plan/status
//
// Supabase's hosted REST API rejects PATCH from browser origins (CORS).
// This route lets the server-side Supabase client perform the update.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["planned", "cooking", "completed"]);

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { family_id, week_start, day_of_week, status } = body as {
    family_id?: unknown;
    week_start?: unknown;
    day_of_week?: unknown;
    status?: unknown;
  };

  if (
    typeof family_id !== "string" ||
    typeof week_start !== "string" ||
    typeof day_of_week !== "number" ||
    typeof status !== "string" ||
    !VALID_STATUSES.has(status)
  ) {
    return Response.json({ error: "Invalid or missing fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meal_plan")
    .update({ status })
    .eq("family_id", family_id)
    .eq("week_start", week_start)
    .eq("day_of_week", day_of_week)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/meal-plan/status] Supabase error:", error);
    return Response.json(
      { error: "Database update failed", details: error.message },
      { status: 500 },
    );
  }

  return Response.json({ data });
}
