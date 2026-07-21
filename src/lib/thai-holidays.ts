// Thai public holidays (government-observed). Dates are the observed dates
// when a holiday falls on a weekend and is substituted to the next working day.
// Extend this list annually as the Thai cabinet announces new dates.

export type ThaiHoliday = { date: string; name_th: string; name_en: string };

export const THAI_HOLIDAYS: ThaiHoliday[] = [
  // 2025
  { date: "2025-01-01", name_th: "วันขึ้นปีใหม่", name_en: "New Year's Day" },
  { date: "2025-02-12", name_th: "วันมาฆบูชา", name_en: "Makha Bucha Day" },
  { date: "2025-04-07", name_th: "วันจักรี (ชดเชย)", name_en: "Chakri Day (observed)" },
  { date: "2025-04-14", name_th: "วันสงกรานต์", name_en: "Songkran" },
  { date: "2025-04-15", name_th: "วันสงกรานต์", name_en: "Songkran" },
  { date: "2025-05-01", name_th: "วันแรงงานแห่งชาติ", name_en: "Labour Day" },
  { date: "2025-05-05", name_th: "วันฉัตรมงคล (ชดเชย)", name_en: "Coronation Day (observed)" },
  { date: "2025-05-12", name_th: "วันวิสาขบูชา (ชดเชย)", name_en: "Visakha Bucha (observed)" },
  { date: "2025-06-03", name_th: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", name_en: "Queen Suthida's Birthday" },
  { date: "2025-07-10", name_th: "วันอาสาฬหบูชา", name_en: "Asalha Bucha Day" },
  { date: "2025-07-11", name_th: "วันเข้าพรรษา", name_en: "Buddhist Lent Day" },
  { date: "2025-07-28", name_th: "วันเฉลิมพระชนมพรรษา ร.10", name_en: "King Vajiralongkorn's Birthday" },
  { date: "2025-08-12", name_th: "วันแม่แห่งชาติ", name_en: "Mother's Day" },
  { date: "2025-10-13", name_th: "วันคล้ายวันสวรรคต ร.9", name_en: "King Bhumibol Memorial Day" },
  { date: "2025-10-23", name_th: "วันปิยมหาราช", name_en: "Chulalongkorn Day" },
  { date: "2025-12-05", name_th: "วันพ่อแห่งชาติ", name_en: "Father's Day" },
  { date: "2025-12-10", name_th: "วันรัฐธรรมนูญ", name_en: "Constitution Day" },
  { date: "2025-12-31", name_th: "วันสิ้นปี", name_en: "New Year's Eve" },

  // 2026
  { date: "2026-01-01", name_th: "วันขึ้นปีใหม่", name_en: "New Year's Day" },
  { date: "2026-01-02", name_th: "วันหยุดพิเศษ", name_en: "Special Holiday" },
  { date: "2026-03-03", name_th: "วันมาฆบูชา", name_en: "Makha Bucha Day" },
  { date: "2026-04-06", name_th: "วันจักรี", name_en: "Chakri Day" },
  { date: "2026-04-13", name_th: "วันสงกรานต์", name_en: "Songkran" },
  { date: "2026-04-14", name_th: "วันสงกรานต์", name_en: "Songkran" },
  { date: "2026-04-15", name_th: "วันสงกรานต์", name_en: "Songkran" },
  { date: "2026-05-01", name_th: "วันแรงงานแห่งชาติ", name_en: "Labour Day" },
  { date: "2026-05-04", name_th: "วันฉัตรมงคล", name_en: "Coronation Day" },
  { date: "2026-06-01", name_th: "วันวิสาขบูชา", name_en: "Visakha Bucha Day" },
  { date: "2026-06-03", name_th: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", name_en: "Queen Suthida's Birthday" },
  { date: "2026-07-29", name_th: "วันอาสาฬหบูชา", name_en: "Asalha Bucha Day" },
  { date: "2026-07-30", name_th: "วันเข้าพรรษา", name_en: "Buddhist Lent Day" },
  { date: "2026-07-28", name_th: "วันเฉลิมพระชนมพรรษา ร.10", name_en: "King Vajiralongkorn's Birthday" },
  { date: "2026-08-12", name_th: "วันแม่แห่งชาติ", name_en: "Mother's Day" },
  { date: "2026-10-13", name_th: "วันคล้ายวันสวรรคต ร.9", name_en: "King Bhumibol Memorial Day" },
  { date: "2026-10-23", name_th: "วันปิยมหาราช", name_en: "Chulalongkorn Day" },
  { date: "2026-12-07", name_th: "วันพ่อแห่งชาติ (ชดเชย)", name_en: "Father's Day (observed)" },
  { date: "2026-12-10", name_th: "วันรัฐธรรมนูญ", name_en: "Constitution Day" },
  { date: "2026-12-31", name_th: "วันสิ้นปี", name_en: "New Year's Eve" },
];

const HOLIDAY_MAP: Map<string, ThaiHoliday> = new Map(THAI_HOLIDAYS.map((h) => [h.date, h]));

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function getHoliday(d: Date): ThaiHoliday | null {
  return HOLIDAY_MAP.get(ymd(d)) ?? null;
}

export function isThaiHoliday(d: Date): boolean {
  return HOLIDAY_MAP.has(ymd(d));
}
