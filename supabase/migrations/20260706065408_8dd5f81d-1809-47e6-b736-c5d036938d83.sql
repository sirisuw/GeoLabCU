
-- Fix security definer view -> use security_invoker so it respects caller RLS
DROP VIEW IF EXISTS public.public_reservations;
CREATE VIEW public.public_reservations
WITH (security_invoker = on) AS
  SELECT id, room_id, start_at, end_at, status
  FROM public.reservations
  WHERE status IN ('approved', 'pending');
GRANT SELECT ON public.public_reservations TO anon, authenticated;

-- Allow anon to read approved/pending time slots via the view (for availability)
CREATE POLICY "Anyone can view approved slots" ON public.reservations
  FOR SELECT TO anon, authenticated USING (status IN ('approved', 'pending'));

-- Lock down SECURITY DEFINER functions - only postgres/service_role should call these directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- has_role is called from RLS policies; leave EXECUTE for authenticated (needed) but revoke anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Tighten reservations INSERT: add minimal validation via trigger instead of always-true
CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  IF char_length(NEW.requester_name) < 2 OR char_length(NEW.requester_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF NEW.requester_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF char_length(NEW.purpose) < 3 OR char_length(NEW.purpose) > 1000 THEN RAISE EXCEPTION 'Invalid purpose'; END IF;
  IF NEW.attendees < 1 OR NEW.attendees > 500 THEN RAISE EXCEPTION 'Invalid attendees'; END IF;
  -- Force status to pending on insert (prevent public users from creating approved reservations)
  IF TG_OP = 'INSERT' THEN NEW.status := 'pending'; END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.validate_reservation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reservations_validate BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.validate_reservation();
