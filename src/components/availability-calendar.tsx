import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHoliday, isThaiHoliday } from "@/lib/thai-holidays";

type Reservation = { id: string; start_at: string; end_at: string; status: string };

const HOUR_START = 9;
const HOUR_END = 16; // exclusive → last slot 15:30–16:00
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const SLOTS = Array.from(
  { length: (HOUR_END - HOUR_START) * SLOTS_PER_HOUR },
  (_, i) => ({ hour: HOUR_START + Math.floor(i / SLOTS_PER_HOUR), minute: (i % SLOTS_PER_HOUR) * SLOT_MINUTES }),
);
const TOTAL_SLOTS = SLOTS.length;
const DAYS = 7;

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  const diff = (dow + 6) % 7; // Monday=0
  x.setDate(x.getDate() - diff);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function formatLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function slotDate(day: Date, slotIdx: number) {
  const { hour, minute } = SLOTS[slotIdx];
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function isWeekend(d: Date) { const w = d.getDay(); return w === 0 || w === 6; }

export function AvailabilityCalendar({
  roomId,
  onPickSlot,
  onPickRange,
  selectedStartIso,
  maxDurationMinutes,
}: {
  roomId: string | undefined;
  onPickSlot?: (startIso: string, endIso: string) => void;
  onPickRange?: (startIso: string, endIso: string) => void;
  selectedStartIso?: string;
  maxDurationMinutes?: number;
}) {
  const { t, lang } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, DAYS), [weekStart]);

  useEffect(() => { setHydrated(true); setWeekStart(startOfWeek(new Date())); }, []);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["room-availability", roomId, weekStart.toISOString()],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { lt: (k: string, v: string) => { gt: (k: string, v: string) => Promise<{ data: Reservation[] | null; error: unknown }> } } } };
      })
        .from("public_reservation_slots")
        .select("id, start_at, end_at, status")
        .eq("room_id", roomId!)
        .lt("start_at", weekEnd.toISOString())
        .gt("end_at", weekStart.toISOString());
      if (error) throw error as Error;
      return data as Reservation[];
    },
  });

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const WEEKDAYS_TH = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
  const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const weekdays = lang === "th" ? WEEKDAYS_TH : WEEKDAYS_EN;
  const months = lang === "th" ? MONTHS_TH : MONTHS_EN;

  const isBooked = (day: Date, slotIdx: number): Reservation | null => {
    const s = slotDate(day, slotIdx);
    const e = new Date(s.getTime() + SLOT_MINUTES * 60_000);
    for (const r of reservations) {
      const rs = new Date(r.start_at); const re = new Date(r.end_at);
      if (rs < e && re > s) return r;
    }
    return null;
  };

  const earliestAllowedDay = useMemo(() => {
    const now = new Date();
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    if (now.getHours() >= 7) d.setDate(d.getDate() + 1);
    while (isWeekend(d)) d.setDate(d.getDate() + 1);
    return d;
  }, []);

  const isCutoff = (day: Date, slotIdx: number) => {
    if (isWeekend(day)) return true;
    if (day < earliestAllowedDay) return true;
    const s = slotDate(day, slotIdx);
    return s.getTime() < Date.now();
  };

  const isSlotAvailable = (dayIdx: number, slotIdx: number) => {
    const day = days[dayIdx];
    if (!roomId) return false;
    if (isCutoff(day, slotIdx)) return false;
    if (isBooked(day, slotIdx)) return false;
    return true;
  };

  // ── Drag / tap-tap selection ──────────────────────────────────────────────
  type Range = { dayIdx: number; start: number; end: number }; // inclusive slot idx
  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<Range | null>(null);
  const anchorRef = useRef<{ dayIdx: number; slot: number } | null>(null);
  const movedRef = useRef(false);

  const maxSlots = maxDurationMinutes ? Math.max(1, Math.floor(maxDurationMinutes / SLOT_MINUTES)) : TOTAL_SLOTS;

  // Extend from anchor toward `to`, clipping at first unavailable slot and max duration.
  const clipTo = (dayIdx: number, anchor: number, to: number): number => {
    if (to === anchor) return anchor;
    const step = to > anchor ? 1 : -1;
    let last = anchor;
    for (let i = anchor + step; step > 0 ? i <= to : i >= to; i += step) {
      if (!isSlotAvailable(dayIdx, i)) break;
      if (Math.abs(i - anchor) + 1 > maxSlots) break;
      last = i;
    }
    return last;
  };

  const commitRange = (r: Range) => {
    const s = slotDate(days[r.dayIdx], r.start);
    const e = new Date(slotDate(days[r.dayIdx], r.end).getTime() + SLOT_MINUTES * 60_000);
    if (onPickRange) onPickRange(formatLocalInput(s), formatLocalInput(e));
    else if (onPickSlot) onPickSlot(formatLocalInput(s), formatLocalInput(e));
  };

  const onSlotDown = (dayIdx: number, slot: number) => {
    if (!isSlotAvailable(dayIdx, slot)) return;
    // If a committed single-tap anchor exists on the same day and a different slot → extend range.
    if (selection && !dragging && selection.dayIdx === dayIdx && selection.start === selection.end && selection.start !== slot) {
      const a = selection.start;
      const clipped = clipTo(dayIdx, a, slot);
      const [lo, hi] = a < clipped ? [a, clipped] : [clipped, a];
      const r = { dayIdx, start: lo, end: hi };
      setSelection(r); commitRange(r); anchorRef.current = null;
      return;
    }
    anchorRef.current = { dayIdx, slot };
    movedRef.current = false;
    setDragging(true);
    setSelection({ dayIdx, start: slot, end: slot });
  };

  const onSlotEnter = (dayIdx: number, slot: number) => {
    if (!dragging || !anchorRef.current) return;
    if (anchorRef.current.dayIdx !== dayIdx) return;
    if (slot !== anchorRef.current.slot) movedRef.current = true;
    const clipped = clipTo(dayIdx, anchorRef.current.slot, slot);
    const a = anchorRef.current.slot;
    const [lo, hi] = a < clipped ? [a, clipped] : [clipped, a];
    setSelection({ dayIdx, start: lo, end: hi });
  };

  const finishDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (selection) commitRange(selection);
  };

  useEffect(() => {
    if (!dragging) return;
    const up = () => finishDrag();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, selection]);

  const clearSelection = () => { setSelection(null); anchorRef.current = null; if (onPickRange) onPickRange("", ""); else if (onPickSlot) onPickSlot("", ""); };

  // If parent passes selectedStartIso and we don't have a local selection matching, derive a single-slot selection.
  useEffect(() => {
    if (!selectedStartIso) return;
    if (selection) return;
    for (let d = 0; d < DAYS; d++) {
      for (let s = 0; s < TOTAL_SLOTS; s++) {
        if (formatLocalInput(slotDate(days[d], s)) === selectedStartIso) {
          setSelection({ dayIdx: d, start: s, end: s });
          return;
        }
      }
    }
  }, [selectedStartIso, days, selection]);

  const inSelection = (dayIdx: number, slot: number) => !!selection && selection.dayIdx === dayIdx && slot >= selection.start && slot <= selection.end;

  const selectionSummary = useMemo(() => {
    if (!selection) return null;
    const s = slotDate(days[selection.dayIdx], selection.start);
    const e = new Date(slotDate(days[selection.dayIdx], selection.end).getTime() + SLOT_MINUTES * 60_000);
    const mins = (e.getTime() - s.getTime()) / 60_000;
    const hours = mins / 60;
    const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${fmt(s)}–${fmt(e)} (${hours % 1 === 0 ? hours : hours.toFixed(1)} ${lang === "th" ? "ชม." : "h"})`;
  }, [selection, days, lang]);

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("cal_title")}</h2>
            <p className="text-xs text-muted-foreground">{roomId ? t("cal_click_free") : t("cal_hint")}</p>
          </div>
        </div>
        <div className="mt-4 h-48 rounded-md bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("cal_title")}</h2>
          <p className="text-xs text-muted-foreground">
            {roomId
              ? (lang === "th" ? "ลากเพื่อเลือกช่วงเวลา หรือแตะจุดเริ่มต้นแล้วแตะจุดสิ้นสุด" : "Drag to select a range, or tap a start slot then a end slot")
              : t("cal_hint")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>{t("cal_today")}</Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("cal_prev")} onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("cal_next")} onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <LegendDot className="bg-muted" label={t("cal_free")} />
        <LegendDot className="bg-gold/70" label={t("cal_pending")} />
        <LegendDot className="bg-destructive/70" label={t("cal_booked")} />
        <LegendDot className="bg-[color:var(--chula-pink)]" label={lang === "th" ? "เลือกอยู่" : "Selected"} />
      </div>

      <p className="mt-2 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-muted-foreground">
        {t("cal_cutoff_rule")} · {lang === "th" ? "เวลาทำการ 09:00–16:00 น. เฉพาะวันจันทร์–ศุกร์" : "Hours 09:00–16:00, Mon–Fri only"}
        {maxDurationMinutes ? ` · ${lang === "th" ? "สูงสุด" : "Max"} ${maxDurationMinutes / 60} ${lang === "th" ? "ชั่วโมง" : "hours"}` : ""}
      </p>

      {selection && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--chula-pink)]/10 px-3 py-1.5 text-xs font-medium text-[color:var(--chula-pink)]">
          <span>{lang === "th" ? "จอง" : "Booking"} {selectionSummary}</span>
          <button type="button" onClick={clearSelection} aria-label="clear" className="grid h-5 w-5 place-items-center rounded-full hover:bg-[color:var(--chula-pink)]/20">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto select-none" onPointerLeave={finishDrag}>
        <div className="min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${DAYS}, minmax(0, 1fr))` }}>
            <div />
            {days.map((d, i) => {
              const today = new Date();
              const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
              const weekend = isWeekend(d);
              return (
                <div key={i} className={cn("px-1 pb-2 text-center text-xs font-medium", isToday && "rounded-md bg-[color:var(--chula-pink)]/10 text-foreground", weekend && "opacity-60")}>
                  <div className={cn(isToday && "text-[color:var(--chula-pink)] font-semibold")}>{weekdays[i]}</div>
                  <div className={cn("text-muted-foreground", isToday && "font-semibold text-[color:var(--chula-pink)]")}>{d.getDate()} {months[d.getMonth()]}</div>
                  {weekend && <div className="mt-0.5 text-[10px] text-muted-foreground">{lang === "th" ? "ปิดทำการ" : "Closed"}</div>}
                </div>
              );
            })}
            {SLOTS.map(({ hour, minute }, slotIdx) => {
              const label = `${pad(hour)}:${pad(minute)}`;
              const isHourStart = minute === 0;
              return (
                <Fragment key={`row-${label}`}>
                  <div className={cn("pr-2 text-right text-[10px] leading-7", isHourStart ? "text-muted-foreground" : "text-muted-foreground/50")}>
                    {isHourStart ? label : ""}
                  </div>
                  {days.map((d, dayIdx) => {
                    const weekend = isWeekend(d);
                    const r = roomId && !weekend ? isBooked(d, slotIdx) : null;
                    const cutoff = !weekend && isCutoff(d, slotIdx);
                    const selected = inSelection(dayIdx, slotIdx);
                    const disabled = !roomId || weekend || !!r || cutoff;
                    const cls = weekend
                      ? "bg-muted/20 cursor-not-allowed"
                      : !roomId
                      ? "bg-muted/40"
                      : selected
                      ? "bg-[color:var(--chula-pink)] ring-2 ring-[color:var(--chula-pink)]"
                      : cutoff
                      ? "bg-muted/30 cursor-not-allowed opacity-50"
                      : r
                      ? r.status === "approved" || r.status === "confirmed" ? "bg-destructive/70" : "bg-gold/70"
                      : "bg-muted hover:bg-[color:var(--chula-pink)]/25 cursor-pointer";
                    return (
                      <button
                        key={`c-${d.toISOString()}-${label}`}
                        type="button"
                        disabled={disabled}
                        onPointerDown={(e) => { if (disabled) return; e.preventDefault(); onSlotDown(dayIdx, slotIdx); }}
                        onPointerEnter={() => { if (!disabled) onSlotEnter(dayIdx, slotIdx); }}
                        title={weekend ? (lang === "th" ? "ปิดทำการ" : "Closed") : `${label} — ${cutoff ? t("cal_cutoff_rule") : r ? (r.status === "approved" || r.status === "confirmed" ? t("cal_booked") : t("cal_pending")) : t("cal_free")}`}
                        className={cn("m-[1px] h-7 rounded-sm border transition-colors touch-none", isHourStart ? "border-border/50" : "border-border/20", cls)}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading && roomId && <p className="mt-3 text-xs text-muted-foreground">…</p>}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded-sm border border-border/50", className)} />
      {label}
    </span>
  );
}
