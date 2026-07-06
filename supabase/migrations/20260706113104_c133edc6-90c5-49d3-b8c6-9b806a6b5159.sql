
DROP POLICY IF EXISTS "Anyone can read reservation by approval token" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can update via approval token" ON public.reservations;
DROP POLICY IF EXISTS "Public can view slot times only" ON public.reservations;

DROP VIEW IF EXISTS public.public_reservation_slots;
CREATE VIEW public.public_reservation_slots
WITH (security_invoker = false) AS
SELECT id, room_id, start_at, end_at, status
FROM public.reservations
WHERE status IN ('approved'::reservation_status, 'pending'::reservation_status);

REVOKE ALL ON public.public_reservation_slots FROM PUBLIC;
GRANT SELECT ON public.public_reservation_slots TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_reservation_by_token(_role text, _token uuid)
RETURNS TABLE (
  id uuid,
  requester_name text,
  requester_email text,
  purpose text,
  start_at timestamptz,
  end_at timestamptz,
  attendees integer,
  advisor_name text,
  ta_status text,
  advisor_status text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.requester_name, r.requester_email, r.purpose,
         r.start_at, r.end_at, r.attendees, r.advisor_name,
         r.ta_status, r.advisor_status, r.status::text
  FROM public.reservations r
  WHERE (_role = 'ta' AND r.ta_token = _token)
     OR (_role = 'advisor' AND r.advisor_token = _token)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_reservation_by_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reservation_by_token(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.decide_reservation_by_token(_role text, _token uuid, _decision text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  IF _role = 'ta' THEN
    UPDATE public.reservations
       SET ta_status = _decision, ta_decided_at = now()
     WHERE ta_token = _token AND ta_status = 'pending';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSIF _role = 'advisor' THEN
    UPDATE public.reservations
       SET advisor_status = _decision, advisor_decided_at = now()
     WHERE advisor_token = _token AND advisor_status = 'pending';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Invalid role';
  END IF;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_reservation_by_token(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_reservation_by_token(text, uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_reservation_approvals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_reservation_emails() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_requester_on_admin_decision() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
