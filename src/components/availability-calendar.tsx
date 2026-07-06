import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Reservation = { id: string; start_at: string; end_at: string; status: string };

const HOUR_START = 8;
const HOUR_END = 20; // exclusive
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const SLOTS = Array.from(
  { length: (HOUR_END - HOUR_START) * SLOTS_PER_HOUR },
  (_, i) => ({ hour: HOUR_START + Math.floor(i / SLOTS_PER_HOUR), minute: (i % SLOTS_PER_HOUR) * SLOT_MINUTES }),
);
const DAYS = 7;

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0..6 Sun..Sat
  const diff = (dow + 6) % 7; // make Monday=0
  x.setDate(x.getDate() - diff);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AvailabilityCalendar({
  roomId,
  onPickSlot,
}: {
  roomId: string | undefined;
  onPickSlot?: (startIso: string, endIso: string) => void;
}) {
  const { t, lang } = useI18n();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, DAYS), [weekStart]);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["room-availability", roomId, weekStart.toISOString()],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, start_at, end_at, status")
        .eq("room_id", roomId!)
        .in("status", ["approved", "pending"])
        .lt("start_at", weekEnd.toISOString())
        .gt("end_at", weekStart.toISOString());
      if (error) throw error;
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

  const isBooked = (day: Date, hour: number): Reservation | null => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hour + 1);
    for (const r of reservations) {
      const s = new Date(r.start_at);
      const e = new Date(r.end_at);
      if (s < slotEnd && e > slotStart) return r;
    }
    return null;
  };

  const pickSlot = (day: Date, hour: number) => {
    if (!onPickSlot) return;
    const s = new Date(day);
    s.setHours(hour, 0, 0, 0);
    const e = new Date(s);
    e.setHours(hour + 1);
    onPickSlot(formatLocalInput(s), formatLocalInput(e));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("cal_title")}</h2>
          <p className="text-xs text-muted-foreground">
            {roomId ? t("cal_click_free") : t("cal_hint")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {t("cal_today")}
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("cal_prev")} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("cal_next")} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <LegendDot className="bg-muted" label={t("cal_free")} />
        <LegendDot className="bg-gold/70" label={t("cal_pending")} />
        <LegendDot className="bg-destructive/70" label={t("cal_booked")} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${DAYS}, minmax(0, 1fr))` }}>
            <div />
            {days.map((d, i) => (
              <div key={i} className="px-1 pb-2 text-center text-xs font-medium">
                <div>{weekdays[i]}</div>
                <div className="text-muted-foreground">{d.getDate()} {months[d.getMonth()]}</div>
              </div>
            ))}
            {HOURS.map((h) => (
              <Fragment key={`row-${h}`}>
                <div className="pr-2 text-right text-[10px] text-muted-foreground leading-8">
                  {String(h).padStart(2, "0")}:00
                </div>
                {days.map((d) => {
                  const r = roomId ? isBooked(d, h) : null;
                  const disabled = !roomId || !!r;
                  const cls = !roomId
                    ? "bg-muted/40"
                    : r
                    ? r.status === "approved"
                      ? "bg-destructive/70"
                      : "bg-gold/70"
                    : "bg-muted hover:bg-primary/20 cursor-pointer";
                  return (
                    <button
                      key={`c-${d.toISOString()}-${h}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => pickSlot(d, h)}
                      title={r ? (r.status === "approved" ? t("cal_booked") : t("cal_pending")) : t("cal_free")}
                      className={cn("m-[1px] h-8 rounded-sm border border-border/50 transition-colors", cls)}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {isLoading && roomId && (
        <p className="mt-3 text-xs text-muted-foreground">…</p>
      )}
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
