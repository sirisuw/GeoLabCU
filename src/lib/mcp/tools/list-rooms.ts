import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_rooms",
  title: "List rooms",
  description:
    "List all active laboratory and computer rooms in the Department of Geology, including their code, name, type, floor, and equipment.",
  inputSchema: {
    type: z
      .enum(["lab", "pc", "classroom", "any"])
      .optional()
      .describe("Filter by room type. Defaults to any."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ type }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from("rooms")
      .select("id, code, name_th, name_en, type, floor, equipment, is_active")
      .eq("is_active", true)
      .order("code");
    if (type && type !== "any") query = query.eq("type", type);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { rooms: data ?? [] },
    };
  },
});
