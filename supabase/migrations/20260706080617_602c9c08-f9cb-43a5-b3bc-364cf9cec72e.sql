
-- 1) Restrict public read of reservations to non-PII via a view; drop overly broad SELECT
DROP POLICY IF EXISTS "Anyone can view approved slots" ON public.reservations;

-- Only admins can read full reservation rows (existing admin policy remains).
-- Provide a safe public view for booked-slot visibility (no PII).
CREATE OR REPLACE VIEW public.reservation_slots
WITH (security_invoker = true) AS
SELECT id, room_id, start_at, end_at, status
FROM public.reservations
WHERE status IN ('approved','pending');

-- Owner-scoped SELECT policy for the view to work under invoker rights (anon/auth need row visibility)
CREATE POLICY "Public can view slot times only"
ON public.reservations
FOR SELECT
TO anon, authenticated
USING (status IN ('approved','pending'));

-- Column-level: revoke PII columns from anon/authenticated, only expose slot columns
REVOKE SELECT ON public.reservations FROM anon, authenticated;
GRANT SELECT (id, room_id, start_at, end_at, status) ON public.reservations TO anon, authenticated;

GRANT SELECT ON public.reservation_slots TO anon, authenticated;

-- 2) Tighten INSERT policy (remove WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations"
ON public.reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(requester_name) BETWEEN 2 AND 120
  AND requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(purpose) BETWEEN 3 AND 1000
  AND attendees BETWEEN 1 AND 500
  AND end_at > start_at
  AND status = 'pending'
);

-- 3) Revoke EXECUTE on SECURITY DEFINER trigger functions from public roles (they run via triggers, not direct calls)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
