ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'pending_ta_advisor';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'pending_admin';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'ta_approved';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'no_show';