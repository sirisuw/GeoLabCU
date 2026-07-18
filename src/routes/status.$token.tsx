import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Circle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TrackingRow = {
  id: string;
  status: string;
  rejected_stage: string | null;
  rejection_reason: string | null;
  advisor_name: string | null;
  advisor_status: string | null;
  advisor_decided_at: string | null;
  ta_status: string | null;
  staff_decided_at: string | null;
  admin_decided_at: string | null;
  created_at: string;
  expires_at: string | null;
  start_at: string;
  end_at: string;
  purpose: string | null;
  attendees: number | null;
  equipment: string | null;
  room_code: string | null;
  room_name_en: string | null;
  room_name_th: string | null;
  requester_name: string | null;
  has_advisor: boolean;
};

export const Route = createFileRoute("/status/$token")({
  head: () => ({
    meta: [
      { title: "Track reservation status / ติดตามสถานะคำขอ" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

type StepState = "done" | "current" | "future" | "rejected" | "skipped";

function StatusPage() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tracking", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_reservation_by_tracking_token" as never,
        { _token: token } as never,
      );
      if (error) throw error;
      const rows = (data ?? []) as TrackingRow[];
      return rows;
    },
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="container-page py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="container-page py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">ไม่พบคำขอ / Request not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ลิงก์นี้ไม่ถูกต้องหรือถูกลบไปแล้ว<br />
            This tracking link is invalid or no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="eyebrow">ติดตามสถานะคำขอ</p>
          <h1 className="mt-1 text-3xl font-semibold">Request status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.length > 1
              ? `คำขอนี้มี ${data.length} ห้อง / This request covers ${data.length} rooms.`
              : "แสดงสถานะแบบเรียลไทม์ · Live status"}
          </p>
        </div>

        {data.map((r) => (
          <ReservationCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

function ReservationCard({ r }: { r: TrackingRow }) {
  const isRejected = r.status === "rejected";
  const isExpired = r.status === "expired";
  const isConfirmed = r.status === "confirmed" || r.status === "approved" || r.status === "completed";

  // Build the ordered steps
  const steps: Array<{
    key: string;
    labelTh: string;
    labelEn: string;
    state: StepState;
    at?: string | null;
    detail?: string;
  }> = [];

  // Step: submitted (always done)
  steps.push({
    key: "submitted",
    labelTh: "ส่งคำขอแล้ว",
    labelEn: "Request submitted",
    state: "done",
    at: r.created_at,
  });

  // Step: advisor (skip if no advisor)
  if (r.has_advisor) {
    const advisorDone = !!r.advisor_decided_at && r.advisor_status === "approved";
    const advisorRejected = r.rejected_stage === "advisor";
    steps.push({
      key: "advisor",
      labelTh: "อาจารย์ที่ปรึกษาอนุมัติ",
      labelEn: "Advisor approval",
      state: advisorRejected
        ? "rejected"
        : advisorDone
          ? "done"
          : r.status === "pending_advisor"
            ? "current"
            : "future",
      at: r.advisor_decided_at,
      detail: r.advisor_name ?? undefined,
    });
  }

  // Step: staff
  const staffDone = !!r.staff_decided_at && r.ta_status === "approved";
  const staffRejected = r.rejected_stage === "ta" || r.rejected_stage === "staff";
  steps.push({
    key: "staff",
    labelTh: "เจ้าหน้าที่อนุมัติ",
    labelEn: "Lab staff approval",
    state: staffRejected
      ? "rejected"
      : staffDone
        ? "done"
        : r.status === "pending_staff"
          ? "current"
          : (r.status === "pending_advisor" ? "future" : (staffDone || isConfirmed ? "done" : "future")),
    at: r.staff_decided_at,
  });

  // Step: admin
  const adminRejected = r.rejected_stage === "admin";
  steps.push({
    key: "admin",
    labelTh: "ผู้ดูแลยืนยัน",
    labelEn: "Admin confirmation",
    state: adminRejected
      ? "rejected"
      : isConfirmed
        ? "done"
        : r.status === "pending_admin"
          ? "current"
          : "future",
    at: isConfirmed ? r.admin_decided_at : null,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {r.room_code}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold">{r.room_name_th ?? r.room_name_en}</h2>
        </div>
        <StatusPill status={r.status} />
      </div>

      {/* Timeline */}
      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <li key={s.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StepIcon state={s.state} />
              {i < steps.length - 1 && (
                <span
                  className={`mt-1 h-8 w-0.5 ${
                    s.state === "done" ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`font-medium ${
                    s.state === "current"
                      ? "text-[color:var(--chula-pink)]"
                      : s.state === "rejected"
                        ? "text-destructive"
                        : s.state === "future"
                          ? "text-muted-foreground"
                          : ""
                  }`}
                >
                  {s.labelTh}
                </span>
                <span className="text-xs text-muted-foreground">{s.labelEn}</span>
              </div>
              {s.state === "current" && !isExpired && (
                <p className="mt-0.5 text-sm text-[color:var(--chula-pink)]">กำลังรอ... / Waiting</p>
              )}
              {s.state === "done" && s.at && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ✓ {new Date(s.at).toLocaleString()}
                  {s.detail ? ` · ${s.detail}` : ""}
                </p>
              )}
              {s.state === "rejected" && (
                <p className="mt-0.5 text-sm text-destructive">
                  ปฏิเสธในขั้นนี้ / Rejected at this stage
                  {r.rejection_reason ? ` — ${r.rejection_reason}` : ""}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {isExpired && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          คำขอหมดอายุ / Request expired. โปรดยื่นคำขอใหม่.
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm md:grid-cols-2">
        <SummaryRow k="Request ID" v={r.id.slice(0, 8)} mono />
        <SummaryRow k="ผู้ขอ / Requester" v={r.requester_name ?? "-"} />
        <SummaryRow k="เริ่ม / Start" v={new Date(r.start_at).toLocaleString()} />
        <SummaryRow k="สิ้นสุด / End" v={new Date(r.end_at).toLocaleString()} />
        {r.attendees != null && <SummaryRow k="จำนวน / Attendees" v={String(r.attendees)} />}
        {r.equipment && <SummaryRow k="อุปกรณ์ / Equipment" v={r.equipment} />}
        {r.purpose && <SummaryRow k="วัตถุประสงค์ / Purpose" v={r.purpose} />}
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const base = "grid h-8 w-8 place-items-center rounded-full";
  if (state === "done") return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle2 className="h-5 w-5" /></span>;
  if (state === "current") return <span className={`${base} bg-[color:var(--chula-pink)]/15 text-[color:var(--chula-pink)] animate-pulse`}><Clock className="h-5 w-5" /></span>;
  if (state === "rejected") return <span className={`${base} bg-destructive/15 text-destructive`}><XCircle className="h-5 w-5" /></span>;
  return <span className={`${base} bg-muted text-muted-foreground`}><Circle className="h-4 w-4" /></span>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_advisor: { label: "รออาจารย์ · Awaiting advisor", cls: "bg-[color:var(--chula-pink)]/15 text-[color:var(--chula-pink)]" },
    pending_staff: { label: "รอเจ้าหน้าที่ · Awaiting staff", cls: "bg-[color:var(--chula-pink)]/15 text-[color:var(--chula-pink)]" },
    pending_admin: { label: "รอผู้ดูแล · Awaiting admin", cls: "bg-[color:var(--chula-pink)]/15 text-[color:var(--chula-pink)]" },
    confirmed: { label: "ยืนยันแล้ว · Confirmed", cls: "bg-green-100 text-green-800" },
    approved: { label: "อนุมัติแล้ว · Approved", cls: "bg-green-100 text-green-800" },
    completed: { label: "เสร็จสิ้น · Completed", cls: "bg-muted text-muted-foreground" },
    rejected: { label: "ปฏิเสธ · Rejected", cls: "bg-destructive/15 text-destructive" },
    expired: { label: "หมดอายุ · Expired", cls: "bg-amber-100 text-amber-800" },
    cancelled: { label: "ยกเลิก · Cancelled", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function SummaryRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{v}</p>
    </div>
  );
}
