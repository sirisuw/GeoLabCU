import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvailabilityCalendar } from "@/components/availability-calendar";

type EquipmentItem = { name: string; model?: string };
type Room = { id: string; code: string; name_en: string; name_th: string; type: "lab" | "pc"; capacity: number; equipment: EquipmentItem[] | null };
type EquipSel = { checked: string[]; other: string };

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
  advisor_id: z.string().uuid("Please select your advisor"),
  equipment: z.string().trim().max(2000).optional(),
  sample_count: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(3).max(1000),
  attendees: z.coerce.number().int().min(1).max(500),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  confirmed_contact: z.literal(true, { errorMap: () => ({ message: "Please confirm you contacted the officer and advisor" }) }),
  confirmed_calendar: z.literal(true, { errorMap: () => ({ message: "Please confirm you checked the calendar" }) }),
});

type Advisor = { id: string; name_th: string; name_en: string; email: string | null };

function ReservePage() {
  const { t, lang } = useI18n();
  const { room: preselectedRoom } = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Earliest allowed booking date. Before 7 AM → today; from 7 AM onward → tomorrow.
  const earliestAllowed = (() => {
    const now = new Date();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    if (now.getHours() >= 7) d.setDate(d.getDate() + 1);
    return d;
  })();
  const pad = (n: number) => String(n).padStart(2, "0");
  const minStartLocal = `${earliestAllowed.getFullYear()}-${pad(earliestAllowed.getMonth() + 1)}-${pad(earliestAllowed.getDate())}T00:00`;

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, code, name_en, name_th, type, capacity, equipment").eq("active", true).order("code");
      if (error) throw error;
      return data as unknown as Room[];
    },
  });

  const { data: advisors = [] } = useQuery({
    queryKey: ["advisors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("advisors" as never).select("id, name_th, name_en, email").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as unknown as Advisor[];
    },
  });

  const [form, setForm] = useState({
    room_ids: preselectedRoom ? [preselectedRoom] : ([] as string[]),
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    user_status: "" as "" | (typeof USER_STATUSES)[number],
    advisor_id: "",
    sample_count: "",
    purpose: "",
    attendees: "1",
    start_at: "",
    end_at: "",
    confirmed_contact: false,
    confirmed_calendar: false,
  });
  const [equipByRoom, setEquipByRoom] = useState<Record<string, EquipSel>>({});

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const getEquip = (roomId: string): EquipSel => equipByRoom[roomId] ?? { checked: [], other: "" };
  const setEquip = (roomId: string, next: EquipSel) => setEquipByRoom((m) => ({ ...m, [roomId]: next }));

  const buildEquipmentText = (roomId: string): string => {
    const sel = getEquip(roomId);
    const parts = [...sel.checked];
    if (sel.other.trim()) parts.push(sel.other.trim());
    return parts.join(", ");
  };

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
    if (new Date(payload.start_at) < earliestAllowed) {
      toast.error(
        lang === "th"
          ? "หากจองหลัง 7:00 น. เริ่มใช้ห้องได้ตั้งแต่วันถัดไปเท่านั้น"
          : "Bookings made after 7:00 AM can only start from the next day.",
      );
      return;
    }
    // Per-room equipment validation
    for (const rid of payload.room_ids) {
      const text = buildEquipmentText(rid);
      if (!text) {
        const room = rooms.find((r) => r.id === rid);
        toast.error(
          (lang === "th" ? "กรุณาระบุอุปกรณ์สำหรับห้อง " : "Please specify equipment for room ") +
            (room?.code ?? ""),
        );
        return;
      }
    }
    setSubmitting(true);
    const advisor = advisors.find((a) => a.id === payload.advisor_id);
    const advisorName = advisor ? `${advisor.name_th} (${advisor.name_en})` : "";
    const rows = payload.room_ids.map((room_id) => {
      const sel = getEquip(room_id);
      const equipment_selected = [
        ...sel.checked.map((name) => ({ name })),
        ...(sel.other.trim() ? [{ name: sel.other.trim() }] : []),
      ];
      return {
        room_id,
        requester_name: payload.requester_name,
        requester_email: payload.requester_email,
        requester_phone: payload.requester_phone,
        advisor_id: payload.advisor_id,
        advisor_name: advisorName,
        purpose: payload.purpose,
        attendees: payload.attendees,
        start_at: new Date(payload.start_at).toISOString(),
        end_at: new Date(payload.end_at).toISOString(),
        user_status: payload.user_status,
        equipment: buildEquipmentText(room_id),
        equipment_selected,
        sample_count: payload.sample_count,
        student_id: null,
        confirmed_contact: payload.confirmed_contact,
        confirmed_calendar: payload.confirmed_calendar,
      };
    });
    const { error } = await supabase.from("reservations").insert(rows as never);
    setSubmitting(false);
    if (error) {
      toast.error(t("f_error") + " " + (error.message || ""));
      return;
    }
    toast.success(t("f_success"));
    setSuccess(true);
    setForm((f) => ({ ...f, requester_name: "", requester_email: "", requester_phone: "", sample_count: "", purpose: "", start_at: "", end_at: "", confirmed_contact: false, confirmed_calendar: false }));
    setEquipByRoom({});
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
            <div className="rounded-lg border border-border bg-background p-3 max-h-64 overflow-y-auto space-y-2">
              {rooms.length === 0 && (
                <p className="text-sm text-muted-foreground">{lang === "th" ? "กำลังโหลด…" : "Loading…"}</p>
              )}
              {rooms.map((r) => {
                const checked = form.room_ids.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-3 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          room_ids: v === true
                            ? [...f.room_ids, r.id]
                            : f.room_ids.filter((id) => id !== r.id),
                        }))
                      }
                    />
                    <span className="font-display text-xs font-semibold text-gold">{r.code}</span>
                    <span>{lang === "th" ? r.name_th : r.name_en}</span>
                  </label>
                );
              })}
            </div>
            {form.room_ids.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {lang === "th"
                  ? `เลือกแล้ว ${form.room_ids.length} ห้อง — จะสร้างคำขอแยกกันต่อห้อง`
                  : `${form.room_ids.length} rooms selected — a separate request will be created per room`}
              </p>
            )}
          </Field>

          <AvailabilityCalendar
            roomId={form.room_ids[0]}
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
              <Select value={form.advisor_id} onValueChange={(v) => set("advisor_id", v)}>
                <SelectTrigger><SelectValue placeholder={t("f_advisor_ph")} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {advisors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{lang === "th" ? a.name_th : a.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("f_equipment")} required>
            {form.room_ids.length === 0 && (
              <p className="text-xs text-muted-foreground">{lang === "th" ? "โปรดเลือกห้องก่อน" : "Please select a room first."}</p>
            )}
            <div className="space-y-3">
              {form.room_ids.map((rid) => {
                const room = rooms.find((r) => r.id === rid);
                if (!room) return null;
                const items = Array.isArray(room.equipment) ? room.equipment : [];
                const sel = getEquip(rid);
                return (
                  <div key={rid} className="rounded-lg border border-border bg-background p-3">
                    <p className="mb-2 text-sm font-medium">
                      <span className="font-display text-xs font-semibold text-gold">{room.code}</span>{" "}
                      <span className="text-foreground/80">{lang === "th" ? room.name_th : room.name_en}</span>
                    </p>
                    {items.length > 0 ? (
                      <>
                        <p className="mb-2 text-xs text-muted-foreground">{t("f_equipment_pick")}</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {items.map((it) => {
                            const label = it.model ? `${it.name} (${it.model})` : it.name;
                            const checked = sel.checked.includes(label);
                            return (
                              <label key={label} className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => setEquip(rid, {
                                    ...sel,
                                    checked: v === true ? [...sel.checked, label] : sel.checked.filter((x) => x !== label),
                                  })}
                                />
                                <span>{label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">{t("f_equipment_other")}</Label>
                          <Input
                            value={sel.other}
                            onChange={(e) => setEquip(rid, { ...sel, other: e.target.value })}
                            maxLength={300}
                            className="mt-1"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-xs text-muted-foreground">{t("f_equipment_none")}</p>
                        <Textarea
                          value={sel.other}
                          onChange={(e) => setEquip(rid, { ...sel, other: e.target.value })}
                          rows={2}
                          maxLength={500}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t("f_equipment_hint")}</p>
          </Field>

          <Field label={t("f_samples")} required>
            <Input value={form.sample_count} onChange={(e) => set("sample_count", e.target.value)} maxLength={200} required />
            <p className="text-xs text-muted-foreground">{t("f_samples_hint")}</p>
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("f_start")} required>
              <Input type="datetime-local" min={minStartLocal} value={form.start_at} onChange={(e) => set("start_at", e.target.value)} required />
            </Field>
            <Field label={t("f_end")} required>
              <Input type="datetime-local" min={minStartLocal} value={form.end_at} onChange={(e) => set("end_at", e.target.value)} required />
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
