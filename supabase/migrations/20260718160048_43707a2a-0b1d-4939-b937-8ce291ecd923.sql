ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'pending_advisor';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'pending_staff';