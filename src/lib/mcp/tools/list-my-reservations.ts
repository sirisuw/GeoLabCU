import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_reservations",
  title: "List reservations (admin)",
  description:
    "List reservations visible to the signed-in user. Admins see all reservations; other users see none. Filter by status when useful.",
  inputSchema: {
    status: z
      .string()
      .optional()
      .describe(
        "Optional status filter (e.g. pending_advisor, pending_staff, pending_admin, confirmed, rejected).",
      ),
    limit: z
      .number()
      .int()
      .optional()
      .describe("Max rows to return. Defaults to 25."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated" }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("reservations")
      .select(
        "id, status, start_at, end_at, requester_name, requester_email, room_ids, purpose, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { reservations: data ?? [] },
    };
  },
});
