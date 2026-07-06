import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
};

export const Route = createFileRoute("/approve/$role/$token")({
  head: () => ({ meta: [{ title: "Approve reservation — Geo Labs" }] }),
  component: ApprovePage,
});

function ApprovePage() {
  const { role, token } = Route.useParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  const isTA = role === "ta";
  const isAdvisor = role === "advisor";
  const tokenCol = isTA ? "ta_token" : "advisor_token";
  const statusCol = isTA ? "ta_status" : "advisor_status";
  const decidedCol = isTA ? "ta_decided_at" : "advisor_decided_at";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["approval", role, token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, requester_name, requester_email, purpose, start_at, end_at, attendees, advisor_name, ta_status, advisor_status, status")
        .eq(tokenCol, token)
        .maybeSingle();
      if (error) throw error;
      return data as Reservation | null;
    },
    enabled: isTA || isAdvisor,
  });

  if (!isTA && !isAdvisor) {
    return <Center>Invalid approval link.</Center>;
  }

  if (isLoading) {
    return <Center><Loader2 className="h-6 w-6 animate-spin" /></Center>;
  }

  if (error || !data) {
    return <Center>Approval link is invalid or has expired.<br />ลิงก์อนุมัตินี้ไม่ถูกต้องหรือหมดอายุ</Center>;
  }

  const alreadyDecided = data[statusCol as "ta_status" | "advisor_status"] !== "pending";

  const decide = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    const { error } = await supabase
      .from("reservations")
      .update({ [statusCol]: decision, [decidedCol]: new Date().toISOString() } as never)
      .eq(tokenCol, token);
    setSubmitting(false);
    if (error) return alert(error.message);
    setDone(decision);
    refetch();
  };

  if (done || alreadyDecided) {
    const final = done ?? (data[statusCol as "ta_status" | "advisor_status"] as "approved" | "rejected");
    return (
      <Center>
        {final === "approved" ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
        ) : (
          <XCircle className="mx-auto h-14 w-14 text-destructive" />
        )}
        <h1 className="mt-4 text-2xl font-semibold">
          {final === "approved" ? "Approved / อนุมัติแล้ว" : "Rejected / ปฏิเสธแล้ว"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you. Your decision has been recorded.<br />
          ขอบคุณ ระบบได้บันทึกการตัดสินใจของคุณแล้ว
        </p>
      </Center>
    );
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8">
        <p className="eyebrow">{isTA ? "TA Approval" : "Advisor Approval"}</p>
        <h1 className="mt-2 text-3xl font-semibold">Reservation request</h1>
        <p className="mt-1 text-sm text-muted-foreground">คำขอจองห้อง</p>

        <dl className="mt-6 space-y-3 text-sm">
          <Row k="Requester / ผู้ขอ" v={data.requester_name} />
          <Row k="Email" v={data.requester_email} />
          <Row k="Advisor / อาจารย์ที่ปรึกษา" v={data.advisor_name} />
          <Row k="Start / เริ่ม" v={new Date(data.start_at).toLocaleString()} />
          <Row k="End / สิ้นสุด" v={new Date(data.end_at).toLocaleString()} />
          <Row k="Attendees / จำนวน" v={String(data.attendees)} />
          <Row k="Purpose / วัตถุประสงค์" v={data.purpose} />
        </dl>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => decide("approved")} disabled={submitting} className="flex-1">
            Approve / อนุมัติ
          </Button>
          <Button onClick={() => decide("rejected")} disabled={submitting} variant="destructive" className="flex-1">
            Reject / ปฏิเสธ
          </Button>
        </div>
      </div>
    </div>
  );
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
