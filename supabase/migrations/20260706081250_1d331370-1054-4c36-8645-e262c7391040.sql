
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('bachelor','master','phd','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS user_status public.user_status,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS sample_count text,
  ADD COLUMN IF NOT EXISTS confirmed_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_calendar boolean NOT NULL DEFAULT false;

-- Allow anon/authenticated to insert the new columns; keep SELECT restricted (PII protection unchanged)
GRANT INSERT (user_status, equipment, sample_count, confirmed_contact, confirmed_calendar) ON public.reservations TO anon, authenticated;
