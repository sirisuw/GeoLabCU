import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Reservation = {
  id: string;
  requester_name: string;
  requester_email: string;
  purpose: string;
  start_at: string;
  end_at: string;
  attendees: number;
  advisor_name: string;
  ta_status: string;
  advisor_status: string;
  status: string;
  advisor_decided_at: string | null;
};

export const Route = createFileRoute("/approve/$role/$token")({
  head: () => ({ meta: [{ title: "Approve reservation — Geo Labs" }] }),
  component: ApprovePage,
});

function ApprovePage() {
  const { role, token } = Route.useParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [gateError, setGateError] = useState<{ code: string; stage?: string } | null>(null);

  const isAdvisor = role === "advisor";
  const isStaff = role === "ta" || role === "staff";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["approval", role, token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_reservation_by_token" as never,
        { _role: role, _token: token } as never,
      );
      if (error) throw error;
      const row = Array.isArray(data) ? (data[0] as Reservation | undefined) : (data as Reservation | null);
      return row ?? null;
    },
    enabled: isAdvisor || isStaff,
  });

  if (!isAdvisor && !isStaff) return <Center>Invalid approval link.</Center>;
  if (isLoading) return <Center><Loader2 className="h-6 w-6 animate-spin" /></Center>;
  if (error || !data) return <Center>Approval link is invalid or has expired.<br />ลิงก์อนุมัตินี้ไม่ถูกต้องหรือหมดอายุ</Center>;

  // Client-side stage hint (server enforces authoritatively)
  const expectedStage = isAdvisor ? "pending_advisor" : "pending_staff";
  const currentStage = data.status;
  const wrongStage =
    isStaff && currentStage === "pending_advisor"
      ? { code: "wrong_stage" as const, stage: currentStage }
      : null;
  const alreadyDecided =
    currentStage !== expectedStage &&
    currentStage !== "pending_advisor" &&
    !wrongStage;

  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !reason.trim()) {
      setShowReject(true);
      return;
    }
    setSubmitting(true);
    const { data: res, error } = await supabase.rpc(
      "decide_reservation_by_token" as never,
      { _role: role, _token: token, _decision: decision, _reason: reason.trim() || null } as never,
    );
    setSubmitting(false);
    if (error) return alert(error.message);
    const result = res as { ok: boolean; error?: string; stage?: string } | null;
    if (!result?.ok) {
      setGateError({ code: result?.error ?? "unknown", stage: result?.stage });
      return;
    }
    setDone(decision);
    refetch();
  };

  if (gateError) {
    return (
      <Center>
        <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold">
          {stageMessage(gateError.code, gateError.stage, isAdvisor).th}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {stageMessage(gateError.code, gateError.stage, isAdvisor).en}
        </p>
      </Center>
    );
  }

  if (wrongStage) {
    return (
      <Center>
        <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold">คำขอนี้ยังรอการอนุมัติจากอาจารย์ที่ปรึกษา</h1>
        <p className="mt-2 text-sm text-muted-foreground">This request is still awaiting advisor approval. You will receive a new email once the advisor has responded.</p>
      </Center>
    );
  }

  if (done || alreadyDecided) {
    const final = done ?? (currentStage as string);
    const isApproved = final === "approved" || currentStage === "confirmed" || currentStage === "pending_staff" || currentStage === "pending_admin";
    return (
      <Center>
        {isApproved ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        ) : (
          <XCircle className="mx-auto h-14 w-14 text-destructive" />
        )}
        <h1 className="mt-4 text-2xl font-semibold">
          {isApproved ? "บันทึกการอนุมัติแล้ว / Approved" : "บันทึกการปฏิเสธแล้ว / Rejected"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ขอบคุณ ระบบได้บันทึกการตัดสินใจของคุณแล้ว<br />
          Thank you. Your decision has been recorded.
        </p>
      </Center>
    );
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8">
        <p className="eyebrow">{isAdvisor ? "Advisor Approval (Step 1 of 3)" : "Lab Staff Approval (Step 2 of 3)"}</p>
        <h1 className="mt-2 text-3xl font-semibold">Reservation request</h1>
        <p className="mt-1 text-sm text-muted-foreground">คำขอจองห้อง</p>

        {isStaff && data.advisor_decided_at && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            ✓ อนุมัติโดยอาจารย์ {data.advisor_name} เมื่อ{" "}
            {new Date(data.advisor_decided_at).toLocaleString()}
            <br />
            <span className="text-xs opacity-80">Approved by advisor.</span>
          </div>
        )}

        <dl className="mt-6 space-y-3 text-sm">
          <Row k="Requester / ผู้ขอ" v={data.requester_name} />
          <Row k="Email" v={data.requester_email} />
          <Row k="Advisor / อาจารย์ที่ปรึกษา" v={data.advisor_name} />
          <Row k="Start / เริ่ม" v={new Date(data.start_at).toLocaleString()} />
          <Row k="End / สิ้นสุด" v={new Date(data.end_at).toLocaleString()} />
          <Row k="Attendees / จำนวน" v={String(data.attendees)} />
          <Row k="Purpose / วัตถุประสงค์" v={data.purpose} />
        </dl>

        {showReject && (
          <div className="mt-6">
            <label className="mb-1 block text-sm font-medium">เหตุผลในการปฏิเสธ / Reason for rejection *</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Button onClick={() => decide("approved")} disabled={submitting} className="flex-1">
            Approve / อนุมัติ
          </Button>
          {!showReject ? (
            <Button onClick={() => setShowReject(true)} disabled={submitting} variant="destructive" className="flex-1">
              Reject / ปฏิเสธ
            </Button>
          ) : (
            <Button onClick={() => decide("rejected")} disabled={submitting || !reason.trim()} variant="destructive" className="flex-1">
              Confirm reject / ยืนยันปฏิเสธ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function stageMessage(code: string, stage: string | undefined, isAdvisor: boolean) {
  if (code === "wrong_stage") {
    return {
      th: "คำขอนี้ยังรอการอนุมัติจากอาจารย์ที่ปรึกษา",
      en: "This request is still awaiting advisor approval.",
    };
  }
  if (code === "already_decided") {
    return {
      th: `คำขอนี้ถูกดำเนินการไปแล้ว (สถานะ: ${stage ?? "-"})`,
      en: `This request has already been processed (status: ${stage ?? "-"}).`,
    };
  }
  if (code === "not_found") {
    return { th: "ไม่พบคำขอ", en: "Reservation not found." };
  }
  return { th: "ไม่สามารถดำเนินการได้", en: `Cannot proceed (${code}).` };
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center">
        {children}
      </div>
    </div>
  );
}
