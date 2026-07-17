import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const Route = createFileRoute("/api/public/hooks/send-emails")({
  server: {
    handlers: {
      POST: async () => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const FROM = process.env.EMAIL_FROM ?? "GeoCU Lab <onboarding@resend.dev>";
        if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
          return new Response(JSON.stringify({ ok: false, error: "not_configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows, error } = await supabaseAdmin
          .from("pending_emails")
          .select("id, to_email, subject, body_html")
          .in("status", ["pending", "queued"])
          .limit(50);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        let sent = 0;
        let failed = 0;
        for (const e of rows ?? []) {
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
              console.error(`Resend failed [${res.status}]: ${body}`);
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
            console.error("Send exception", err);
            failed++;
          }
        }
        return new Response(JSON.stringify({ ok: true, sent, failed, total: rows?.length ?? 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
