
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS head_of_lab text,
  ADD COLUMN IF NOT EXISTS staff_in_charge text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS google_calendar_url text,
  ADD COLUMN IF NOT EXISTS equipment jsonb NOT NULL DEFAULT '[]'::jsonb;
