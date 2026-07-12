import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type PendingEmail = {
  id: string;
  to_email: string;
  subject: string;
  body_html: string;
};

/**
 * Reads pending_emails where status='pending', sends via Resend, marks sent/failed.
 * Public server fn — safe because it only processes rows the DB already created,
 * and reveals nothing back to the caller beyond counts.
 */
export const processPendingEmails = createServerFn({ method: "POST" }).handler(async () => {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.EMAIL_FROM ?? "GeoCU Lab <onboarding@resend.dev>";

  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, error: "Email service not configured" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("pending_emails")
    .select("id, to_email, subject, body_html")
    .eq("status", "pending")
    .limit(20);
  if (error) return { ok: false, error: error.message };

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
        await supabaseAdmin
          .from("pending_emails")
          .update({ status: "failed" })
          .eq("id", e.id);
        failed++;
      } else {
        await supabaseAdmin
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
