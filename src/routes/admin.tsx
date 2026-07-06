import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, LogOut, CalendarDays, Users, Mail, Phone, Building2 } from "lucide-react";
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
  status: "pending" | "approved" | "rejected" | "cancelled";
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
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Reservation[];
    },
  });

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
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
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(r.id, "approved")}>
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
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-1.5 text-muted-foreground"><span className="text-gold">{icon}</span>{text}</div>;
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map: Record<Reservation["status"], string> = {
    pending: "bg-gold/20 text-gold-foreground border-gold/40",
    approved: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  const label: Record<Reservation["status"], string> = {
    pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}>{label[status]}</span>;
}

function formatDT(iso: string, lang: string) {
  const d = new Date(iso);
  return d.toLocaleString(lang === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium", timeStyle: "short",
  });
}
