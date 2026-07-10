import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, LogOut, CalendarDays, Users, Mail, Phone, Building2, Inbox, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Geo Labs" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Reservation = {
  id: string;
  room_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  department: string | null;
  student_id: string | null;
  advisor_name: string | null;
  purpose: string;
  attendees: number;
  start_at: string;
  end_at: string;
  status: "pending" | "pending_ta_advisor" | "pending_admin" | "ta_approved" | "approved" | "confirmed" | "rejected" | "cancelled" | "expired" | "completed" | "no_show";
  admin_notes: string | null;
  created_at: string;
  rooms: { code: string; name_en: string; name_th: string } | null;
};

function AdminPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [session, setSession] = useState<{ email: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else { setSession({ email: data.session.user.email ?? "" }); setReady(true); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["reservations", filter],
    enabled: ready,
    queryFn: async () => {
      let q = supabase
        .from("reservations")
        .select("*, rooms(code, name_en, name_th)")
        .order("created_at", { ascending: false });
      if (filter === "pending") q = q.in("status", ["pending", "ta_approved", "pending_ta_advisor", "pending_admin"]);
      else if (filter === "approved") q = q.in("status", ["approved", "confirmed"]);
      else if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Reservation[];
    },
  });

  const updateStatus = async (id: string, status: "confirmed" | "rejected") => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(lang === "th" ? "อัปเดตแล้ว" : "Updated");
    qc.invalidateQueries({ queryKey: ["reservations"] });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!ready) return <div className="container-page py-24 text-center text-muted-foreground">…</div>;

  return (
    <div className="container-page py-14">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">04 · Admin</p>
          <h1 className="mt-2 text-4xl font-semibold">{t("admin_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{session?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/reserve">{t("nav_reserve")}</Link></Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="mr-1.5 h-4 w-4" />{t("admin_signout")}</Button>
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-md border border-border bg-card p-1 text-sm font-medium">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 transition ${filter === f ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"}`}
          >
            {f === "all" ? t("admin_all") : f === "pending" ? t("admin_pending") : f === "approved" ? t("admin_approved") : t("admin_rejected")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          {t("admin_no_reservations")}
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xs font-semibold uppercase tracking-widest text-gold">{r.rooms?.code}</span>
                    <span className="text-sm font-semibold">{lang === "th" ? r.rooms?.name_th : r.rooms?.name_en}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
                    <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} text={`${formatDT(r.start_at, lang)} → ${formatDT(r.end_at, lang)}`} />
                    <InfoRow icon={<Users className="h-3.5 w-3.5" />} text={`${r.attendees} ${t("rooms_seats")}`} />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} text={`${r.requester_name} · ${r.requester_email}`} />
                    {r.requester_phone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} text={r.requester_phone} />}
                    {r.department && <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} text={r.department} />}
                  </div>
                  <p className="mt-3 rounded-md bg-muted p-3 text-sm">{r.purpose}</p>
                </div>
                {(r.status === "pending" || r.status === "ta_approved" || r.status === "pending_ta_advisor" || r.status === "pending_admin") && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(r.id, "confirmed")}>
                      <Check className="mr-1 h-4 w-4" />{t("admin_approve")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                      <X className="mr-1 h-4 w-4" />{t("admin_reject")}
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <RoleAssigner />
      <PendingEmailsPanel />
    </div>
  );
}

type PendingEmail = {
  id: string;
  reservation_id: string | null;
  to_email: string;
  subject: string;
  body_html: string;
  template: string;
  status: string;
  created_at: string;
  sent_at: string | null;
};

function PendingEmailsPanel() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["pending_emails"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_emails" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PendingEmail[];
    },
  });

  return (
    <section className="mt-12 rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <Inbox className="h-5 w-5 text-gold" />
          <div>
            <h2 className="text-lg font-semibold">
              {lang === "th" ? "อีเมลรอส่ง (ตัวอย่าง)" : "Pending emails (drafts)"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lang === "th"
                ? "อีเมลจะถูกส่งจริงหลังตั้งค่าโดเมนอีเมล"
                : "These will send once an email domain is configured"}
            </p>
          </div>
        </div>
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>

      {open && (
        <div className="border-t border-border p-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {lang === "th" ? "ยังไม่มีอีเมลรอส่ง" : "No pending emails yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {emails.map((e) => (
                <div key={e.id} className="rounded-md border border-border bg-background">
                  <button
                    onClick={() => setExpandedId((id) => (id === e.id ? null : e.id))}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase">
                          {e.template}
                        </span>
                        <span className="truncate font-medium">{e.to_email}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.subject}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </button>
                  {expandedId === e.id && (
                    <div
                      className="border-t border-border p-4 text-sm prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: e.body_html }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}


function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-1.5 text-muted-foreground"><span className="text-gold">{icon}</span>{text}</div>;
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map: Record<Reservation["status"], string> = {
    pending: "bg-gold/20 text-gold-foreground border-gold/40",
    pending_ta_advisor: "bg-gold/20 text-gold-foreground border-gold/40",
    pending_admin: "bg-gold/20 text-gold-foreground border-gold/40",
    ta_approved: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
    approved: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
    confirmed: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    expired: "bg-muted text-muted-foreground border-border",
    completed: "bg-muted text-muted-foreground border-border",
    no_show: "bg-destructive/15 text-destructive border-destructive/30",
  };
  const label: Record<Reservation["status"], string> = {
    pending: "Pending", pending_ta_advisor: "Awaiting TA/Advisor", pending_admin: "Awaiting Admin",
    ta_approved: "TA Approved", approved: "Approved", confirmed: "Confirmed",
    rejected: "Rejected", cancelled: "Cancelled",
    expired: "Expired", completed: "Completed", no_show: "No-show",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}>{label[status]}</span>;
}

function formatDT(iso: string, lang: string) {
  const d = new Date(iso);
  return d.toLocaleString(lang === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium", timeStyle: "short",
  });
}
