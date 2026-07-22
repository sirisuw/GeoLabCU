
-- Extend holidays to support recurring (annual) and dated (year-specific) entries
ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS month int,
  ADD COLUMN IF NOT EXISTS day int;

ALTER TABLE public.holidays ALTER COLUMN date DROP NOT NULL;

ALTER TABLE public.holidays DROP CONSTRAINT IF EXISTS holidays_shape_check;
ALTER TABLE public.holidays ADD CONSTRAINT holidays_shape_check CHECK (
  (recurring = true  AND month BETWEEN 1 AND 12 AND day BETWEEN 1 AND 31 AND date IS NULL)
  OR
  (recurring = false AND date IS NOT NULL AND month IS NULL AND day IS NULL)
);

-- Unique-per-year for dated, unique month/day for recurring
DROP INDEX IF EXISTS holidays_date_unique;
CREATE UNIQUE INDEX IF NOT EXISTS holidays_date_unique ON public.holidays(date) WHERE recurring = false;
CREATE UNIQUE INDEX IF NOT EXISTS holidays_recurring_unique ON public.holidays(month, day) WHERE recurring = true;

-- Working-day helper: match dated OR recurring
CREATE OR REPLACE FUNCTION public.is_working_day(d date)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXTRACT(DOW FROM d)::int NOT IN (0,6)
     AND NOT EXISTS (
       SELECT 1 FROM public.holidays h
       WHERE (h.recurring = false AND h.date = d)
          OR (h.recurring = true  AND h.month = EXTRACT(MONTH FROM d)::int
                                   AND h.day   = EXTRACT(DAY   FROM d)::int)
     );
$function$;

-- Seed recurring Thai fixed holidays (idempotent)
INSERT INTO public.holidays (recurring, month, day, name_th, name_en, date) VALUES
  (true, 1,  1,  'วันขึ้นปีใหม่', 'New Year''s Day', NULL),
  (true, 4,  6,  'วันจักรี', 'Chakri Day', NULL),
  (true, 4, 13,  'วันสงกรานต์', 'Songkran', NULL),
  (true, 4, 14,  'วันสงกรานต์', 'Songkran', NULL),
  (true, 4, 15,  'วันสงกรานต์', 'Songkran', NULL),
  (true, 5,  1,  'วันแรงงานแห่งชาติ', 'Labour Day', NULL),
  (true, 5,  4,  'วันฉัตรมงคล', 'Coronation Day', NULL),
  (true, 7, 28,  'วันเฉลิมพระชนมพรรษา ร.10', 'King Vajiralongkorn''s Birthday', NULL),
  (true, 8, 12,  'วันแม่แห่งชาติ', 'Mother''s Day', NULL),
  (true,10, 13,  'วันคล้ายวันสวรรคต ร.9', 'King Bhumibol Memorial Day', NULL),
  (true,10, 23,  'วันปิยมหาราช', 'Chulalongkorn Day', NULL),
  (true,12,  5,  'วันพ่อแห่งชาติ', 'Father''s Day', NULL),
  (true,12, 10,  'วันรัฐธรรมนูญ', 'Constitution Day', NULL),
  (true,12, 31,  'วันสิ้นปี', 'New Year''s Eve', NULL)
ON CONFLICT DO NOTHING;

-- Remove dated duplicates of recurring holidays (keep only lunar/substitution/special dated entries)
DELETE FROM public.holidays h
 WHERE h.recurring = false
   AND EXISTS (
     SELECT 1 FROM public.holidays r
     WHERE r.recurring = true
       AND r.month = EXTRACT(MONTH FROM h.date)::int
       AND r.day   = EXTRACT(DAY   FROM h.date)::int
   );
