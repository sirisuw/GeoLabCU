import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ADVISORS } from "@/lib/advisors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvailabilityCalendar } from "@/components/availability-calendar";

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

const USER_STATUSES = ["bachelor", "master", "phd", "staff"] as const;

const formSchema = z.object({
  room_ids: z.array(z.string().uuid()).min(1, "Please select at least one room"),
  requester_name: z.string().trim().min(2).max(120),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().min(1).max(30),
  user_status: z.enum(USER_STATUSES),
  advisor_name: z.string().trim().min(1).max(200),
  equipment: z.string().trim().min(1).max(500),
  sample_count: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(3).max(1000),
  attendees: z.coerce.number().int().min(1).max(500),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  confirmed_contact: z.literal(true, { errorMap: () => ({ message: "Please confirm you contacted the officer and advisor" }) }),
  confirmed_calendar: z.literal(true, { errorMap: () => ({ message: "Please confirm you checked the calendar" }) }),
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
    room_ids: preselectedRoom ? [preselectedRoom] : ([] as string[]),
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    user_status: "" as "" | (typeof USER_STATUSES)[number],
    advisor_name: "",
    equipment: "",
    sample_count: "",
    purpose: "",
    attendees: "1",
    start_at: "",
    end_at: "",
    confirmed_contact: false,
    confirmed_calendar: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

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
    const rows = payload.room_ids.map((room_id) => ({
      room_id,
      requester_name: payload.requester_name,
      requester_email: payload.requester_email,
      requester_phone: payload.requester_phone,
      advisor_name: payload.advisor_name,
      purpose: payload.purpose,
      attendees: payload.attendees,
      start_at: new Date(payload.start_at).toISOString(),
      end_at: new Date(payload.end_at).toISOString(),
      user_status: payload.user_status,
      equipment: payload.equipment,
      sample_count: payload.sample_count,
      confirmed_contact: payload.confirmed_contact,
      confirmed_calendar: payload.confirmed_calendar,
    }));
    const { error } = await supabase.from("reservations").insert(rows as never);
    setSubmitting(false);
    if (error) {
      toast.error(t("f_error") + " " + (error.message || ""));
      return;
    }
    toast.success(t("f_success"));
    setSuccess(true);
    setForm((f) => ({ ...f, requester_name: "", requester_email: "", requester_phone: "", equipment: "", sample_count: "", purpose: "", start_at: "", end_at: "", confirmed_contact: false, confirmed_calendar: false }));
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

          <AvailabilityCalendar
            roomId={form.room_id || undefined}
            onPickSlot={(s, e) => setForm((f) => ({ ...f, start_at: s, end_at: e }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("f_name")} required>
              <Input value={form.requester_name} onChange={(e) => set("requester_name", e.target.value)} maxLength={120} required />
            </Field>
            <Field label={t("f_email")} required>
              <Input type="email" value={form.requester_email} onChange={(e) => set("requester_email", e.target.value)} maxLength={255} required />
            </Field>
            <Field label={t("f_phone")} required>
              <Input value={form.requester_phone} onChange={(e) => set("requester_phone", e.target.value)} maxLength={30} required />
            </Field>
            <Field label={t("f_user_status")} required>
              <Select value={form.user_status} onValueChange={(v) => set("user_status", v as (typeof USER_STATUSES)[number])}>
                <SelectTrigger><SelectValue placeholder={t("f_user_status_ph")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bachelor">{t("f_us_bachelor")}</SelectItem>
                  <SelectItem value="master">{t("f_us_master")}</SelectItem>
                  <SelectItem value="phd">{t("f_us_phd")}</SelectItem>
                  <SelectItem value="staff">{t("f_us_staff")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("f_advisor")} required>
              <Select value={form.advisor_name} onValueChange={(v) => set("advisor_name", v)}>
                <SelectTrigger><SelectValue placeholder={t("f_advisor_ph")} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ADVISORS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("f_equipment")} required>
            <Textarea value={form.equipment} onChange={(e) => set("equipment", e.target.value)} rows={2} maxLength={500} required />
            <p className="text-xs text-muted-foreground">{t("f_equipment_hint")}</p>
          </Field>

          <Field label={t("f_samples")} required>
            <Input value={form.sample_count} onChange={(e) => set("sample_count", e.target.value)} maxLength={200} required />
            <p className="text-xs text-muted-foreground">{t("f_samples_hint")}</p>
          </Field>

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

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">{t("f_confirm_title")} <span className="text-destructive">*</span></p>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={form.confirmed_contact} onCheckedChange={(v) => set("confirmed_contact", v === true)} className="mt-0.5" />
              <span>{t("f_confirm_contact")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={form.confirmed_calendar} onCheckedChange={(v) => set("confirmed_calendar", v === true)} className="mt-0.5" />
              <span>{t("f_confirm_calendar")}</span>
            </label>
          </div>

          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm space-y-2">
            <p className="flex items-center gap-2 font-medium"><Info className="h-4 w-4 text-gold" />{t("f_rules_title")}</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>{t("f_rules_1")}</li>
              <li>{t("f_rules_2")}</li>
              <li>{t("f_rules_3")}</li>
            </ul>
          </div>

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
