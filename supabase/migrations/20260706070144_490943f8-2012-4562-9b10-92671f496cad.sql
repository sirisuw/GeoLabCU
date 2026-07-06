CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  IF char_length(NEW.requester_name) < 2 OR char_length(NEW.requester_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF NEW.requester_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF char_length(NEW.purpose) < 3 OR char_length(NEW.purpose) > 1000 THEN RAISE EXCEPTION 'Invalid purpose'; END IF;
  IF NEW.attendees < 1 OR NEW.attendees > 500 THEN RAISE EXCEPTION 'Invalid attendees'; END IF;
  IF TG_OP = 'INSERT' THEN NEW.status := 'pending'; END IF;

  -- Block overlapping bookings for same room (only against pending/approved)
  IF NEW.status IN ('pending','approved') THEN
    IF EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.room_id = NEW.room_id
        AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND r.status IN ('pending','approved')
        AND tstzrange(r.start_at, r.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'This room is already booked for the selected time window' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END; $function$;