
CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  IF char_length(NEW.requester_name) < 2 OR char_length(NEW.requester_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF NEW.requester_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF char_length(NEW.purpose) < 3 OR char_length(NEW.purpose) > 1000 THEN RAISE EXCEPTION 'Invalid purpose'; END IF;
  IF NEW.attendees < 1 OR NEW.attendees > 500 THEN RAISE EXCEPTION 'Invalid attendees'; END IF;
  -- Do NOT touch NEW.status here; set_reservation_defaults chooses the initial stage.
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.validate_reservation_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  eq jsonb; eq_name text; span_days int; earliest_start timestamptz;
  overlap_exists boolean; room_flow public.flow_type;
BEGIN
  SELECT flow_type INTO room_flow FROM public.rooms WHERE id = NEW.room_id;
  IF NEW.flow_type IS NULL THEN NEW.flow_type := room_flow; END IF;

  IF NEW.end_at <= NEW.start_at THEN RAISE EXCEPTION 'End time must be after start time'; END IF;

  IF TG_OP='INSERT' THEN
    earliest_start := ((date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok')
      + CASE WHEN (now() AT TIME ZONE 'Asia/Bangkok')::time >= '07:00' THEN INTERVAL '1 day' ELSE INTERVAL '0' END)
      AT TIME ZONE 'Asia/Bangkok');
    IF NEW.start_at < earliest_start THEN
      RAISE EXCEPTION 'Bookings after 7:00 AM can only start from the next day (min start: %)', earliest_start;
    END IF;
  END IF;

  IF NEW.flow_type='computer' AND (NEW.end_at - NEW.start_at) > INTERVAL '4 hours' THEN
    RAISE EXCEPTION 'Computer bookings cannot exceed 4 hours';
  END IF;

  IF NEW.flow_type='equipment' THEN
    span_days := EXTRACT(DAY FROM (date_trunc('day',NEW.end_at) - date_trunc('day',NEW.start_at)))::int + 1;
    IF span_days > 5 THEN RAISE EXCEPTION 'Equipment bookings cannot span more than 5 days'; END IF;
  END IF;

  IF NEW.flow_type IN ('equipment','computer') AND jsonb_array_length(COALESCE(NEW.equipment_selected,'[]'::jsonb)) > 0 THEN
    FOR eq IN SELECT * FROM jsonb_array_elements(NEW.equipment_selected) LOOP
      eq_name := eq->>'name';
      IF EXISTS (SELECT 1 FROM public.equipment_maintenance m
                 WHERE m.room_id = NEW.room_id AND m.equipment_name = eq_name AND m.ended_at IS NULL) THEN
        RAISE EXCEPTION 'Equipment "%" is under maintenance', eq_name;
      END IF;
    END LOOP;
  END IF;

  IF NEW.status = 'confirmed'::reservation_status
     AND (TG_OP='INSERT' OR OLD.status <> 'confirmed'::reservation_status) THEN
    IF NEW.flow_type IN ('equipment','computer') AND jsonb_array_length(COALESCE(NEW.equipment_selected,'[]'::jsonb)) > 0 THEN
      FOR eq IN SELECT * FROM jsonb_array_elements(NEW.equipment_selected) LOOP
        eq_name := eq->>'name';
        SELECT EXISTS (
          SELECT 1 FROM public.reservations r
          WHERE r.room_id = NEW.room_id
            AND r.id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
            AND r.status = 'confirmed'::reservation_status
            AND r.start_at < NEW.end_at AND r.end_at > NEW.start_at
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.equipment_selected) e2 WHERE e2->>'name' = eq_name)
        ) INTO overlap_exists;
        IF overlap_exists THEN RAISE EXCEPTION 'Cannot confirm: equipment "%" already confirmed for that time', eq_name; END IF;
      END LOOP;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.reservations r
        WHERE r.room_id = NEW.room_id
          AND r.id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
          AND r.status = 'confirmed'::reservation_status
          AND r.start_at < NEW.end_at AND r.end_at > NEW.start_at
      ) INTO overlap_exists;
      IF overlap_exists THEN RAISE EXCEPTION 'Cannot confirm: room already confirmed for that time'; END IF;
    END IF;
  END IF;

  -- Do NOT override NEW.status here; set_reservation_defaults handles initial stage.
  IF TG_OP='INSERT' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END $$;
