import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type PendingEmail = {
  id: string;
  to_email: string;
  subject: string;
  body_html: string;
};

/**
 * Reads pending_emails as the signed-in admin (RLS-scoped) and sends via Resend.
 * Admin-only: relies on the admin RLS policy to see/update the queue.
 */
export const processPendingEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.EMAIL_FROM ?? "GeoCU Lab <onboarding@resend.dev>";

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return { ok: false, error: "Email service not configured", sent: 0, failed: 0, total: 0 };
    }

    // Verify caller is admin before using their session to touch the queue.
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return { ok: false, error: "forbidden", sent: 0, failed: 0, total: 0 };
    }

    const { data: rows, error } = await context.supabase
      .from("pending_emails")
      .select("id, to_email, subject, body_html")
      .in("status", ["pending", "queued"])
      .limit(50);
    if (error) return { ok: false, error: error.message, sent: 0, failed: 0, total: 0 };

    const emails = (rows ?? []) as PendingEmail[];
    let sent = 0;
    let failed = 0;

    for (const e of emails) {
      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: FROM,
            to: [e.to_email],
            subject: e.subject,
            html: e.body_html,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`Resend send failed [${res.status}]: ${body}`);
          await context.supabase
            .from("pending_emails")
            .update({ status: "failed" })
            .eq("id", e.id);
          failed++;
        } else {
          await context.supabase
            .from("pending_emails")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", e.id);
          sent++;
        }
      } catch (err) {
        console.error("Resend exception", err);
        failed++;
      }
    }

    return { ok: true, sent, failed, total: emails.length };
  });

