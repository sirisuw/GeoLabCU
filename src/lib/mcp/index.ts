import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRoomsTool from "./tools/list-rooms";
import listAdvisorsTool from "./tools/list-advisors";
import getReservationStatusTool from "./tools/get-reservation-status";
import listMyReservationsTool from "./tools/list-my-reservations";

// OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "geoculab-mcp",
  title: "Geo Labs MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Chulalongkorn Department of Geology room reservation system. Read rooms and advisor lists, look up a reservation by its tracking token, and (for signed-in admins) list pending reservations.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listRoomsTool,
    listAdvisorsTool,
    getReservationStatusTool,
    listMyReservationsTool,
  ],
});
