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
  RETURN NEW;
END; $function$;