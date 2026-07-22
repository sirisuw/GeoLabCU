import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { THAI_HOLIDAYS, type ThaiHoliday } from "@/lib/thai-holidays";

export type HolidayInfo = { name_th: string; name_en: string };

type DatedRow = { date: string; name_th: string; name_en: string; recurring: false };
type RecurringRow = { month: number; day: number; name_th: string; name_en: string; recurring: true };

export type HolidayMap = {
  dated: Map<string, HolidayInfo>;      // key: YYYY-MM-DD
  recurring: Map<string, HolidayInfo>;  // key: MM-DD
};

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function mmdd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Load holidays (dated + recurring) from the database, merged with the static
 * fallback so the calendar still works if the fetch fails.
 */
export function useHolidays(): HolidayMap {
  const { data } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays" as never)
        .select("date, name_th, name_en, recurring, month, day");
      if (error) throw error;
      return (data ?? []) as unknown as Array<DatedRow | RecurringRow>;
    },
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const dated = new Map<string, HolidayInfo>();
    const recurring = new Map<string, HolidayInfo>();
    // Static fallback (all dated)
    for (const h of THAI_HOLIDAYS) dated.set(h.date, { name_th: h.name_th, name_en: h.name_en });
    if (data) {
      for (const h of data) {
        if (h.recurring) {
          const p = (n: number) => String(n).padStart(2, "0");
          recurring.set(`${p(h.month)}-${p(h.day)}`, { name_th: h.name_th, name_en: h.name_en });
        } else if (h.date) {
          dated.set(h.date, { name_th: h.name_th, name_en: h.name_en });
        }
      }
    }
    return { dated, recurring };
  }, [data]);
}

export function getHolidayFrom(map: HolidayMap, d: Date): HolidayInfo | null {
  return map.dated.get(ymd(d)) ?? map.recurring.get(mmdd(d)) ?? null;
}
export function isHolidayFrom(map: HolidayMap, d: Date): boolean {
  return map.dated.has(ymd(d)) || map.recurring.has(mmdd(d));
}
export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}
export function isWorkingDayFrom(map: HolidayMap, d: Date): boolean {
  return !isWeekend(d) && !isHolidayFrom(map, d);
}

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

export function earliestBookingDay(map: HolidayMap, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (now.getHours() >= 7) d.setDate(d.getDate() + 1);
  while (!isWorkingDayFrom(map, d)) d.setDate(d.getDate() + 1);
  return d;
}
