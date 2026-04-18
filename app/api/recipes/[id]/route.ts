// Route: PATCH /api/recipes/[id]
//
// Root cause for this route's existence:
//   Supabase's hosted REST API does not allow PATCH from browser origins — the
//   CORS preflight for PATCH is rejected, so client-side updateRecipe calls
//   never reach the DB. Routing the update through this Next.js handler lets
//   the server-side Supabase client (no CORS restriction) perform the PATCH.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fields the client is allowed to patch.
const ALLOWED_FIELDS = new Set([
  "name",
  "emoji",
  "time_minutes",
  "tags",
  "category",
  "servings",
  "notes",
  "image_url",
  "is_favorite",
  "queue_for_next_plan",
  "queue_order",
]);

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/recipes/[id]">,
) {
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { family_id, ...rawFields } = body as {
    family_id?: string;
    [key: string]: unknown;
  };

  // Strip unknown fields so we never accidentally overwrite DB columns.
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawFields)) {
    if (ALLOWED_FIELDS.has(k) && v !== undefined) {
      fields[k] = v;
    }
  }

  if (Object.keys(fields).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase.from("recipes").update(fields).eq("id", id);
  if (family_id) {
    query = query.eq("family_id", family_id);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error("[PATCH /api/recipes/:id] Supabase error:", {
      message: error.message,
      code: error.code,
      id,
      fields,
    });
    return Response.json(
      { error: "Database update failed", details: error.message },
      { status: 500 },
    );
  }

  return Response.json({ data });
}
