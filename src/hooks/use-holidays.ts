import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { THAI_HOLIDAYS, type ThaiHoliday } from "@/lib/thai-holidays";

export type HolidayMap = Map<string, ThaiHoliday>;

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Load holidays from the database, merged with the built-in static fallback.
 * All four working-day surfaces (calendar UI, earliest-start cutoff,
 * 5-day equipment span, and 48h approval expiry) read through this hook and
 * the helpers below so the definition of "working day" stays consistent.
 */
export function useHolidays(): HolidayMap {
  const { data } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays" as never)
        .select("date, name_th, name_en");
      if (error) throw error;
      return (data ?? []) as unknown as ThaiHoliday[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(() => {
    const m: HolidayMap = new Map();
    for (const h of THAI_HOLIDAYS) m.set(h.date, h);
    if (data) for (const h of data) m.set(h.date, h);
    return m;
  }, [data]);
}

export function getHolidayFrom(map: HolidayMap, d: Date): ThaiHoliday | null {
  return map.get(ymd(d)) ?? null;
}
export function isHolidayFrom(map: HolidayMap, d: Date): boolean {
  return map.has(ymd(d));
}
export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}
export function isWorkingDayFrom(map: HolidayMap, d: Date): boolean {
  return !isWeekend(d) && !isHolidayFrom(map, d);
}

/**
 * Count working days between two dates (inclusive), skipping weekends & holidays.
 */
export function workingDaysBetween(map: HolidayMap, start: Date, end: Date): number {
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  if (e < s) return 0;
  let n = 0;
  const d = new Date(s);
  while (d <= e) {
    if (isWorkingDayFrom(map, d)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/**
 * Earliest permitted booking start date. Before 07:00 Asia/Bangkok → today;
 * from 07:00 onward → next day. Then skip forward past any non-working day.
 */
export function earliestBookingDay(map: HolidayMap, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (now.getHours() >= 7) d.setDate(d.getDate() + 1);
  while (!isWorkingDayFrom(map, d)) d.setDate(d.getDate() + 1);
  return d;
}
