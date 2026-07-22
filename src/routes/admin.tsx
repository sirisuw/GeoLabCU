import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, LogOut, CalendarDays, Users, Mail, Phone, Building2, Inbox, ChevronDown, ChevronRight, Settings, Send, Calendar as CalendarIcon, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { processPendingEmails } from "@/lib/emails.functions";

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
    processPendingEmails().catch(() => {});
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

      <SettingsPanel />
      <HolidaysPanel />
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

function RoleAssigner() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ta" | "lab_officer" | "admin">("ta");
  const [group, setGroup] = useState<"sopit" | "kanchalika" | "wiyada" | "none">("sopit");
  const [busy, setBusy] = useState(false);

  const assign = async () => {
    if (!email.trim()) return toast.error("Enter user email");
    setBusy(true);
    // Look up user id from auth via a lightweight profiles/user_roles path is not exposed to clients.
    // As a stopgap, ask the user to provide the user id (uuid) in the email field if not signed up yet.
    const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(email.trim());
    let userId = email.trim();
    if (!looksLikeUuid) {
      setBusy(false);
      return toast.error("Paste the user's UUID (from auth) — email lookup requires backend fn (coming next)");
    }
    const payload: { user_id: string; role: typeof role; officer_group: typeof group | null } = {
      user_id: userId,
      role,
      officer_group: role === "admin" ? null : group,
    };
    const { error } = await supabase.from("user_roles").insert(payload as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Assigned ${role}${role !== "admin" ? ` / ${group}` : ""}`);
    setEmail("");
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-lg font-semibold">Assign staff role</h2>
      <p className="mb-3 text-xs text-muted-foreground">Paste a user's UUID (from their signed-in session) and pick a role + officer group.</p>
      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded border border-border bg-background px-3 py-2 text-sm" placeholder="user UUID" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="rounded border border-border bg-background px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="ta">TA</option>
          <option value="lab_officer">Lab officer</option>
          <option value="admin">Admin</option>
        </select>
        <select className="rounded border border-border bg-background px-3 py-2 text-sm" value={group} onChange={(e) => setGroup(e.target.value as typeof group)} disabled={role === "admin"}>
          <option value="sopit">Sopit (121, 225A, 226C, 228, 232, 234, 235, 235H, 237)</option>
          <option value="kanchalika">Kanchalika (131, 223A, 224, 241, 242)</option>
          <option value="wiyada">Wiyada (130)</option>
          <option value="none">— none —</option>
        </select>
        <Button onClick={assign} disabled={busy}>Assign</Button>
      </div>
    </section>
  );
}

type NotifSetting = { id: string; role: "staff" | "admin"; name: string; email: string; active: boolean };
type AdvisorRow = { id: string; name_th: string; name_en: string; email: string | null; active: boolean; sort_order: number };

function SettingsPanel() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: notif = [] } = useQuery({
    queryKey: ["notification_settings"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_settings" as never).select("*").order("role").order("name");
      if (error) throw error;
      return data as unknown as NotifSetting[];
    },
  });
  const { data: advisors = [] } = useQuery({
    queryKey: ["advisors_admin"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("advisors" as never).select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as AdvisorRow[];
    },
  });

  const updateNotif = async (id: string, patch: Partial<NotifSetting>) => {
    const { error } = await supabase.from("notification_settings" as never).update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notification_settings"] });
  };
  const updateAdvisor = async (id: string, patch: Partial<AdvisorRow>) => {
    const { error } = await supabase.from("advisors" as never).update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["advisors_admin"] });
  };

  const flushQueue = async () => {
    setSending(true);
    const res = await processPendingEmails();
    setSending(false);
    if (res.ok) toast.success(`Sent ${res.sent}, failed ${res.failed}`);
    else toast.error(res.error ?? "Send failed");
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-gold" />
          <div>
            <h2 className="text-lg font-semibold">{lang === "th" ? "ตั้งค่าอีเมลผู้รับ" : "Recipient email settings"}</h2>
            <p className="text-xs text-muted-foreground">{lang === "th" ? "แก้ไขอีเมลเจ้าหน้าที่ ผู้ดูแล และอาจารย์ที่ปรึกษา" : "Edit staff, admin, and advisor emails"}</p>
          </div>
        </div>
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
      {open && (
        <div className="space-y-8 border-t border-border p-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{lang === "th" ? "เจ้าหน้าที่ห้องปฏิบัติการ + ผู้ดูแล" : "Lab staff + admin"}</h3>
              <Button size="sm" variant="outline" onClick={flushQueue} disabled={sending}>
                <Send className="mr-1.5 h-3.5 w-3.5" />{sending ? "…" : lang === "th" ? "ส่งอีเมลที่ค้าง" : "Send queued emails"}
              </Button>
            </div>
            <div className="space-y-2">
              {notif.map((n) => (
                <div key={n.id} className="grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-[100px_1fr_2fr_80px]">
                  <span className="text-xs font-semibold uppercase text-muted-foreground self-center">{n.role}</span>
                  <Input defaultValue={n.name} onBlur={(e) => e.target.value !== n.name && updateNotif(n.id, { name: e.target.value })} />
                  <Input defaultValue={n.email} onBlur={(e) => e.target.value !== n.email && updateNotif(n.id, { email: e.target.value })} />
                  <div className="flex items-center gap-2 self-center">
                    <Switch checked={n.active} onCheckedChange={(v) => updateNotif(n.id, { active: v })} />
                    <span className="text-xs text-muted-foreground">{n.active ? "on" : "off"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{lang === "th" ? "อาจารย์ที่ปรึกษา" : "Project advisors"}</h3>
            <div className="space-y-2">
              {advisors.map((a) => (
                <div key={a.id} className="grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-[2fr_2fr_80px]">
                  <div className="self-center text-sm">
                    <div>{a.name_th}</div>
                    <div className="text-xs text-muted-foreground">{a.name_en}</div>
                  </div>
                  <Input defaultValue={a.email ?? ""} placeholder="email@chula.ac.th" onBlur={(e) => e.target.value !== (a.email ?? "") && updateAdvisor(a.id, { email: e.target.value || null })} />
                  <div className="flex items-center gap-2 self-center">
                    <Switch checked={a.active} onCheckedChange={(v) => updateAdvisor(a.id, { active: v })} />
                    <span className="text-xs text-muted-foreground">{a.active ? "on" : "off"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-1.5 text-muted-foreground"><span className="text-gold">{icon}</span>{text}</div>;
}

type Holiday = {
  id: string;
  date: string | null;
  name_th: string;
  name_en: string;
  recurring: boolean;
  month: number | null;
  day: number | null;
};

const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function HolidaysPanel() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"recurring" | "dated">("recurring");
  const [busy, setBusy] = useState(false);

  // New-row inputs
  const [newDate, setNewDate] = useState("");
  const [newMonth, setNewMonth] = useState<string>("");
  const [newDay, setNewDay] = useState<string>("");
  const [newTh, setNewTh] = useState("");
  const [newEn, setNewEn] = useState("");

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["holidays_admin"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays" as never)
        .select("id, date, name_th, name_en, recurring, month, day")
        .order("recurring", { ascending: false });
      if (error) throw error;
      return data as unknown as Holiday[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["holidays_admin"] });
    qc.invalidateQueries({ queryKey: ["holidays"] });
  };

  const add = async () => {
    if (!newTh.trim() || !newEn.trim()) {
      return toast.error(lang === "th" ? "กรอกชื่อให้ครบ" : "Enter both names");
    }
    let payload: Record<string, unknown>;
    if (tab === "recurring") {
      const m = parseInt(newMonth, 10);
      const d = parseInt(newDay, 10);
      if (!m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
        return toast.error(lang === "th" ? "เดือน/วัน ไม่ถูกต้อง" : "Invalid month/day");
      }
      payload = { recurring: true, month: m, day: d, date: null, name_th: newTh.trim(), name_en: newEn.trim() };
    } else {
      if (!newDate) return toast.error(lang === "th" ? "เลือกวันที่" : "Pick a date");
      payload = { recurring: false, date: newDate, month: null, day: null, name_th: newTh.trim(), name_en: newEn.trim() };
    }
    setBusy(true);
    const { error } = await supabase.from("holidays" as never).insert(payload as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(lang === "th" ? "เพิ่มแล้ว" : "Added");
    setNewDate(""); setNewMonth(""); setNewDay(""); setNewTh(""); setNewEn("");
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === "th" ? "ลบวันหยุดนี้?" : "Delete this holiday?")) return;
    const { error } = await supabase.from("holidays" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(lang === "th" ? "ลบแล้ว" : "Deleted");
    invalidate();
  };

  const update = async (id: string, patch: Partial<Holiday>) => {
    const { error } = await supabase.from("holidays" as never).update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const recurring = holidays.filter((h) => h.recurring)
    .sort((a, b) => (a.month! - b.month!) || (a.day! - b.day!));
  const dated = holidays.filter((h) => !h.recurring);
  const groupedDated = useMemoGroupByYear(dated);

  const recurringLabel = (h: Holiday) =>
    lang === "th"
      ? `${h.day} ${TH_MONTHS_SHORT[(h.month ?? 1) - 1]} — ทุกปี`
      : `${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")} — every year`;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-[color:var(--chula-pink)]" />
          <div>
            <h2 className="text-lg font-semibold">{lang === "th" ? "วันหยุดนักขัตฤกษ์" : "Public holidays"}</h2>
            <p className="text-xs text-muted-foreground">
              {lang === "th"
                ? "จัดการวันหยุด — ระบบจะปิดปฏิทินและป้องกันการจองในวันเหล่านี้ทันที"
                : "Manage holidays — the calendar and booking validation update immediately."}
            </p>
          </div>
        </div>
        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
      {open && (
        <div className="border-t border-border p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("recurring")}
              className={`rounded-md border px-3 py-1.5 text-sm ${tab === "recurring" ? "border-[color:var(--chula-pink)] bg-[color:var(--chula-pink)]/10 font-semibold text-[color:var(--chula-pink)]" : "border-border text-muted-foreground"}`}
            >
              {lang === "th" ? "วันหยุดประจำปี" : "Recurring"}
            </button>
            <button
              type="button"
              onClick={() => setTab("dated")}
              className={`rounded-md border px-3 py-1.5 text-sm ${tab === "dated" ? "border-[color:var(--chula-pink)] bg-[color:var(--chula-pink)]/10 font-semibold text-[color:var(--chula-pink)]" : "border-border text-muted-foreground"}`}
            >
              {lang === "th" ? "วันหยุดเฉพาะปี" : "Dated"}
            </button>
          </div>

          <p className="mb-4 rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
            {lang === "th"
              ? "วันหยุดตามปฏิทินจันทรคติ (เช่น วิสาขบูชา อาสาฬหบูชา) และวันหยุดชดเชย ต้องเพิ่มเป็นรายปีในแท็บ “วันหยุดเฉพาะปี” เพราะวันที่เปลี่ยนทุกปี"
              : "Lunar-calendar Buddhist holidays and cabinet-announced substitution days must be added per year under the “Dated” tab because their dates shift annually."}
          </p>

          {tab === "recurring" ? (
            <>
              <div className="mb-5 grid gap-2 rounded-md border border-dashed border-border bg-background p-3 md:grid-cols-[80px_80px_1fr_1fr_auto]">
                <Input type="number" min={1} max={12} placeholder={lang === "th" ? "เดือน" : "MM"} value={newMonth} onChange={(e) => setNewMonth(e.target.value)} />
                <Input type="number" min={1} max={31} placeholder={lang === "th" ? "วัน" : "DD"} value={newDay} onChange={(e) => setNewDay(e.target.value)} />
                <Input placeholder={lang === "th" ? "ชื่อภาษาไทย" : "Thai name"} value={newTh} onChange={(e) => setNewTh(e.target.value)} />
                <Input placeholder="English name" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
                <Button onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" />{lang === "th" ? "เพิ่ม" : "Add"}</Button>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">…</p>
              ) : recurring.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === "th" ? "ยังไม่มีวันหยุดประจำปี" : "No recurring holidays yet."}</p>
              ) : (
                <div className="space-y-2">
                  {recurring.map((h) => (
                    <div key={h.id} className="grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-[80px_80px_1fr_1fr_140px_40px]">
                      <Input type="number" min={1} max={12} defaultValue={h.month ?? ""} onBlur={(e) => Number(e.target.value) !== h.month && update(h.id, { month: Number(e.target.value) })} />
                      <Input type="number" min={1} max={31} defaultValue={h.day ?? ""} onBlur={(e) => Number(e.target.value) !== h.day && update(h.id, { day: Number(e.target.value) })} />
                      <Input defaultValue={h.name_th} onBlur={(e) => e.target.value !== h.name_th && update(h.id, { name_th: e.target.value })} />
                      <Input defaultValue={h.name_en} onBlur={(e) => e.target.value !== h.name_en && update(h.id, { name_en: e.target.value })} />
                      <div className="flex items-center px-2 text-xs text-muted-foreground">{recurringLabel(h)}</div>
                      <Button size="icon" variant="ghost" onClick={() => remove(h.id)} aria-label="delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-5 grid gap-2 rounded-md border border-dashed border-border bg-background p-3 md:grid-cols-[160px_1fr_1fr_auto]">
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                <Input placeholder={lang === "th" ? "ชื่อภาษาไทย" : "Thai name"} value={newTh} onChange={(e) => setNewTh(e.target.value)} />
                <Input placeholder="English name" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
                <Button onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" />{lang === "th" ? "เพิ่ม" : "Add"}</Button>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">…</p>
              ) : dated.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === "th" ? "ยังไม่มีวันหยุดเฉพาะปี" : "No dated holidays yet."}</p>
              ) : (
                <div className="space-y-6">
                  {groupedDated.map(([year, items]) => (
                    <div key={year}>
                      <h3 className="mb-2 text-sm font-semibold text-[color:var(--chula-pink)]">
                        {year} <span className="ml-2 text-xs font-normal text-muted-foreground">{items.length} {lang === "th" ? "วัน" : "days"}</span>
                      </h3>
                      <div className="space-y-2">
                        {items.map((h) => (
                          <div key={h.id} className="grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-[140px_1fr_1fr_40px]">
                            <Input type="date" defaultValue={h.date ?? ""} onBlur={(e) => e.target.value !== h.date && update(h.id, { date: e.target.value })} />
                            <Input defaultValue={h.name_th} onBlur={(e) => e.target.value !== h.name_th && update(h.id, { name_th: e.target.value })} />
                            <Input defaultValue={h.name_en} onBlur={(e) => e.target.value !== h.name_en && update(h.id, { name_en: e.target.value })} />
                            <Button size="icon" variant="ghost" onClick={() => remove(h.id)} aria-label="delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function useMemoGroupByYear(items: Holiday[]): Array<[string, Holiday[]]> {
  const map = new Map<string, Holiday[]>();
  for (const h of items) {
    if (!h.date) continue;
    const y = h.date.slice(0, 4);
    const arr = map.get(y) ?? [];
    arr.push(h);
    map.set(y, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
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
