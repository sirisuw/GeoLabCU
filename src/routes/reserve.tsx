import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Room = { id: string; code: string; name_en: string; name_th: string; type: "lab" | "pc"; capacity: number };

const searchSchema = z.object({ room: z.string().optional() });

export const Route = createFileRoute("/reserve")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Reserve a room — Geo Labs" },
      { name: "description", content: "Submit a reservation request for a laboratory or computer room." },
    ],
  }),
  component: ReservePage,
});

const formSchema = z.object({
  room_id: z.string().uuid("Please select a room"),
  requester_name: z.string().trim().min(2).max(120),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().max(30).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  student_id: z.string().trim().max(30).optional().or(z.literal("")),
  advisor_name: z.string().trim().max(120).optional().or(z.literal("")),
  purpose: z.string().trim().min(3).max(1000),
  attendees: z.coerce.number().int().min(1).max(500),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
});

function ReservePage() {
  const { t, lang } = useI18n();
  const { room: preselectedRoom } = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, code, name_en, name_th, type, capacity").eq("active", true).order("code");
      if (error) throw error;
      return data as Room[];
    },
  });

  const [form, setForm] = useState({
    room_id: preselectedRoom ?? "",
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    department: "",
    student_id: "",
    advisor_name: "",
    purpose: "",
    attendees: "1",
    start_at: "",
    end_at: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0];
      toast.error(firstErr?.message ?? t("f_error"));
      return;
    }
    const payload = parsed.data;
    if (new Date(payload.end_at) <= new Date(payload.start_at)) {
      toast.error(lang === "th" ? "เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น" : "End time must be after start time");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      room_id: payload.room_id,
      requester_name: payload.requester_name,
      requester_email: payload.requester_email,
      requester_phone: payload.requester_phone || null,
      department: payload.department || null,
      student_id: payload.student_id || null,
      advisor_name: payload.advisor_name || null,
      purpose: payload.purpose,
      attendees: payload.attendees,
      start_at: new Date(payload.start_at).toISOString(),
      end_at: new Date(payload.end_at).toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("f_error") + " " + error.message);
      return;
    }
    toast.success(t("f_success"));
    setSuccess(true);
    setForm((f) => ({ ...f, requester_name: "", requester_email: "", requester_phone: "", purpose: "", start_at: "", end_at: "" }));
  };

  if (success) {
    return (
      <div className="container-page py-24">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
          <h1 className="mt-4 text-2xl font-semibold">{t("f_success")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{lang === "th" ? "หมายเลขคำขอจะถูกส่งไปยังอีเมลของคุณเมื่อได้รับการยืนยัน" : "You will receive a confirmation email when reviewed."}</p>
          <Button className="mt-6" onClick={() => setSuccess(false)}>{lang === "th" ? "จองห้องอื่น" : "Book another room"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">03 · Request</p>
        <h1 className="mt-2 text-4xl font-semibold md:text-5xl">{t("reserve_title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("reserve_sub")}</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
          <Field label={t("f_room")} required>
            <Select value={form.room_id} onValueChange={(v) => set("room_id", v)}>
              <SelectTrigger><SelectValue placeholder={t("f_room_ph")} /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="font-display text-xs font-semibold text-gold mr-2">{r.code}</span>
                    {lang === "th" ? r.name_th : r.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("f_name")} required>
              <Input value={form.requester_name} onChange={(e) => set("requester_name", e.target.value)} maxLength={120} required />
            </Field>
            <Field label={t("f_email")} required>
              <Input type="email" value={form.requester_email} onChange={(e) => set("requester_email", e.target.value)} maxLength={255} required />
            </Field>
            <Field label={t("f_phone")}>
              <Input value={form.requester_phone} onChange={(e) => set("requester_phone", e.target.value)} maxLength={30} />
            </Field>
            <Field label={t("f_department")}>
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} maxLength={120} />
            </Field>
            <Field label={t("f_student_id")}>
              <Input value={form.student_id} onChange={(e) => set("student_id", e.target.value)} maxLength={30} />
            </Field>
            <Field label={t("f_advisor")}>
              <Input value={form.advisor_name} onChange={(e) => set("advisor_name", e.target.value)} maxLength={120} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("f_start")} required>
              <Input type="datetime-local" value={form.start_at} onChange={(e) => set("start_at", e.target.value)} required />
            </Field>
            <Field label={t("f_end")} required>
              <Input type="datetime-local" value={form.end_at} onChange={(e) => set("end_at", e.target.value)} required />
            </Field>
            <Field label={t("f_attendees")} required>
              <Input type="number" min={1} max={500} value={form.attendees} onChange={(e) => set("attendees", e.target.value)} required />
            </Field>
          </div>

          <Field label={t("f_purpose")} required>
            <Textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={4} maxLength={1000} required />
          </Field>

          <Button type="submit" size="lg" disabled={submitting} className="w-full md:w-auto">
            {submitting ? t("f_sending") : t("f_submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
