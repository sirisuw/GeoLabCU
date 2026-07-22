
-- 1) Holidays table
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name_th text NOT NULL,
  name_en text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.holidays TO anon, authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view holidays" ON public.holidays FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage holidays" ON public.holidays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER holidays_updated_at BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Seed 2025–2027
INSERT INTO public.holidays (date, name_th, name_en) VALUES
-- 2025
('2025-01-01','วันขึ้นปีใหม่','New Year''s Day'),
('2025-02-12','วันมาฆบูชา','Makha Bucha Day'),
('2025-04-07','วันจักรี (ชดเชย)','Chakri Day (observed)'),
('2025-04-14','วันสงกรานต์','Songkran'),
('2025-04-15','วันสงกรานต์','Songkran'),
('2025-05-01','วันแรงงานแห่งชาติ','Labour Day'),
('2025-05-05','วันฉัตรมงคล (ชดเชย)','Coronation Day (observed)'),
('2025-05-12','วันวิสาขบูชา (ชดเชย)','Visakha Bucha (observed)'),
('2025-06-03','วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี','Queen Suthida''s Birthday'),
('2025-07-10','วันอาสาฬหบูชา','Asalha Bucha Day'),
('2025-07-11','วันเข้าพรรษา','Buddhist Lent Day'),
('2025-07-28','วันเฉลิมพระชนมพรรษา ร.10','King Vajiralongkorn''s Birthday'),
('2025-08-12','วันแม่แห่งชาติ','Mother''s Day'),
('2025-10-13','วันคล้ายวันสวรรคต ร.9','King Bhumibol Memorial Day'),
('2025-10-23','วันปิยมหาราช','Chulalongkorn Day'),
('2025-12-05','วันพ่อแห่งชาติ','Father''s Day'),
('2025-12-10','วันรัฐธรรมนูญ','Constitution Day'),
('2025-12-31','วันสิ้นปี','New Year''s Eve'),
-- 2026
('2026-01-01','วันขึ้นปีใหม่','New Year''s Day'),
('2026-01-02','วันหยุดพิเศษ','Special Holiday'),
('2026-03-03','วันมาฆบูชา','Makha Bucha Day'),
('2026-04-06','วันจักรี','Chakri Day'),
('2026-04-13','วันสงกรานต์','Songkran'),
('2026-04-14','วันสงกรานต์','Songkran'),
('2026-04-15','วันสงกรานต์','Songkran'),
('2026-05-01','วันแรงงานแห่งชาติ','Labour Day'),
('2026-05-04','วันฉัตรมงคล','Coronation Day'),
('2026-06-01','วันวิสาขบูชา','Visakha Bucha Day'),
('2026-06-03','วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี','Queen Suthida''s Birthday'),
('2026-07-28','วันเฉลิมพระชนมพรรษา ร.10','King Vajiralongkorn''s Birthday'),
('2026-07-29','วันอาสาฬหบูชา','Asalha Bucha Day'),
('2026-07-30','วันเข้าพรรษา','Buddhist Lent Day'),
('2026-08-12','วันแม่แห่งชาติ','Mother''s Day'),
('2026-10-13','วันคล้ายวันสวรรคต ร.9','King Bhumibol Memorial Day'),
('2026-10-23','วันปิยมหาราช','Chulalongkorn Day'),
('2026-12-07','วันพ่อแห่งชาติ (ชดเชย)','Father''s Day (observed)'),
('2026-12-10','วันรัฐธรรมนูญ','Constitution Day'),
('2026-12-31','วันสิ้นปี','New Year''s Eve'),
-- 2027 (fixed-date holidays; lunar dates approximate — admin should update after cabinet announcement)
('2027-01-01','วันขึ้นปีใหม่','New Year''s Day'),
('2027-02-22','วันมาฆบูชา (โดยประมาณ)','Makha Bucha Day (approx)'),
('2027-04-06','วันจักรี','Chakri Day'),
('2027-04-13','วันสงกรานต์','Songkran'),
('2027-04-14','วันสงกรานต์','Songkran'),
('2027-04-15','วันสงกรานต์','Songkran'),
('2027-05-03','วันแรงงานแห่งชาติ (ชดเชย)','Labour Day (observed)'),
('2027-05-04','วันฉัตรมงคล','Coronation Day'),
('2027-05-20','วันวิสาขบูชา (โดยประมาณ)','Visakha Bucha Day (approx)'),
('2027-06-03','วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี','Queen Suthida''s Birthday'),
('2027-07-19','วันอาสาฬหบูชา (โดยประมาณ)','Asalha Bucha Day (approx)'),
('2027-07-20','วันเข้าพรรษา (โดยประมาณ)','Buddhist Lent Day (approx)'),
('2027-07-28','วันเฉลิมพระชนมพรรษา ร.10','King Vajiralongkorn''s Birthday'),
('2027-08-12','วันแม่แห่งชาติ','Mother''s Day'),
('2027-10-13','วันคล้ายวันสวรรคต ร.9','King Bhumibol Memorial Day'),
('2027-10-25','วันปิยมหาราช (ชดเชย)','Chulalongkorn Day (observed)'),
('2027-12-06','วันพ่อแห่งชาติ (ชดเชย)','Father''s Day (observed)'),
('2027-12-10','วันรัฐธรรมนูญ','Constitution Day'),
('2027-12-31','วันสิ้นปี','New Year''s Eve')
ON CONFLICT (date) DO NOTHING;

-- 3) Working-day helpers
CREATE OR REPLACE FUNCTION public.is_working_day(d date) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT EXTRACT(DOW FROM d)::int NOT IN (0,6)
     AND NOT EXISTS (SELECT 1 FROM public.holidays WHERE date = d);
$$;

CREATE OR REPLACE FUNCTION public.working_days_between(s date, e date) RETURNS int
LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT COUNT(*)::int
  FROM generate_series(s::timestamp, e::timestamp, INTERVAL '1 day') g
  WHERE public.is_working_day(g::date);
$$;

CREATE OR REPLACE FUNCTION public.add_working_days(ts timestamptz, n int) RETURNS timestamptz
LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE
  local_ts timestamp := ts AT TIME ZONE 'Asia/Bangkok';
  d date := local_ts::date;
  tm time := local_ts::time;
  added int := 0;
BEGIN
  WHILE added < n LOOP
    d := d + 1;
    IF public.is_working_day(d) THEN added := added + 1; END IF;
  END LOOP;
  RETURN (d + tm) AT TIME ZONE 'Asia/Bangkok';
END $$;

CREATE OR REPLACE FUNCTION public.earliest_booking_start() RETURNS timestamptz
LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE
  now_bkk timestamp := (now() AT TIME ZONE 'Asia/Bangkok');
  d date := now_bkk::date;
BEGIN
  IF now_bkk::time >= TIME '07:00' THEN d := d + 1; END IF;
  WHILE NOT public.is_working_day(d) LOOP d := d + 1; END LOOP;
  RETURN (d + TIME '09:00') AT TIME ZONE 'Asia/Bangkok';
END $$;

-- 4) Rewrite reservation validation to use the helpers everywhere
CREATE OR REPLACE FUNCTION public.validate_reservation_rules() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE
  eq jsonb; eq_name text; span_wd int; earliest_start timestamptz;
  overlap_exists boolean; room_flow public.flow_type;
  s_local timestamp; e_local timestamp;
  s_date date; e_date date;
  s_time time; e_time time;
BEGIN
  SELECT flow_type INTO room_flow FROM public.rooms WHERE id = NEW.room_id;
  IF NEW.flow_type IS NULL THEN NEW.flow_type := room_flow; END IF;
  IF NEW.end_at <= NEW.start_at THEN RAISE EXCEPTION 'End time must be after start time'; END IF;

  s_local := NEW.start_at AT TIME ZONE 'Asia/Bangkok';
  e_local := NEW.end_at   AT TIME ZONE 'Asia/Bangkok';
  s_date := s_local::date; e_date := e_local::date;
  s_time := s_local::time; e_time := e_local::time;

  IF TG_OP='INSERT' THEN
    IF NOT public.is_working_day(s_date) OR NOT public.is_working_day(e_date) THEN
      RAISE EXCEPTION 'Bookings are only allowed on working days (excludes weekends and Thai public holidays) / จองได้เฉพาะวันทำการ (ยกเว้นเสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์)';
    END IF;
    IF s_time < TIME '09:00' OR s_time >= TIME '16:00' THEN
      RAISE EXCEPTION 'Start time must be within 09:00–16:00 / เวลาเริ่มต้นต้องอยู่ระหว่าง 09:00–16:00';
    END IF;
    IF e_time > TIME '16:00' OR e_time <= TIME '09:00' THEN
      RAISE EXCEPTION 'End time must be within 09:00–16:00 / เวลาสิ้นสุดต้องอยู่ระหว่าง 09:00–16:00';
    END IF;

    earliest_start := public.earliest_booking_start();
    IF NEW.start_at < earliest_start THEN
      RAISE EXCEPTION 'Bookings after 7:00 AM can only start from the next working day (min start: %)', earliest_start;
    END IF;
  END IF;

  IF NEW.flow_type='computer' AND (NEW.end_at - NEW.start_at) > INTERVAL '4 hours' THEN
    RAISE EXCEPTION 'Computer bookings cannot exceed 4 hours';
  END IF;

  IF NEW.flow_type='equipment' THEN
    span_wd := public.working_days_between(s_date, e_date);
    IF span_wd > 5 THEN
      RAISE EXCEPTION 'Equipment bookings cannot span more than 5 working days / จองอุปกรณ์ได้ไม่เกิน 5 วันทำการ';
    END IF;
  END IF;

  IF NEW.flow_type IN ('equipment','computer')
     AND jsonb_array_length(COALESCE(NEW.equipment_selected,'[]'::jsonb)) > 0 THEN
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
    IF NEW.flow_type IN ('equipment','computer')
       AND jsonb_array_length(COALESCE(NEW.equipment_selected,'[]'::jsonb)) > 0 THEN
      FOR eq IN SELECT * FROM jsonb_array_elements(NEW.equipment_selected) LOOP
        eq_name := eq->>'name';
        SELECT EXISTS (SELECT 1 FROM public.reservations r
          WHERE r.room_id = NEW.room_id
            AND r.id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
            AND r.status = 'confirmed'::reservation_status
            AND r.start_at < NEW.end_at AND r.end_at > NEW.start_at
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.equipment_selected) e2 WHERE e2->>'name' = eq_name)
        ) INTO overlap_exists;
        IF overlap_exists THEN RAISE EXCEPTION 'Cannot confirm: equipment "%" already confirmed for that time', eq_name; END IF;
      END LOOP;
    ELSE
      SELECT EXISTS (SELECT 1 FROM public.reservations r
        WHERE r.room_id = NEW.room_id
          AND r.id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
          AND r.status = 'confirmed'::reservation_status
          AND r.start_at < NEW.end_at AND r.end_at > NEW.start_at
      ) INTO overlap_exists;
      IF overlap_exists THEN RAISE EXCEPTION 'Cannot confirm: room already confirmed for that time'; END IF;
    END IF;
  END IF;

  IF TG_OP='INSERT' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := public.add_working_days(now(), 2);
  END IF;
  RETURN NEW;
END $$;

-- 5) Update expiry in set_reservation_defaults and decide_reservation_by_token to use working-day helper
CREATE OR REPLACE FUNCTION public.set_reservation_defaults() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE adv_email text;
BEGIN
  IF NEW.advisor_id IS NOT NULL THEN
    SELECT email INTO adv_email FROM public.advisors WHERE id = NEW.advisor_id;
    IF adv_email IS NOT NULL AND btrim(adv_email) <> '' THEN NEW.advisor_email := adv_email; END IF;
  END IF;
  IF NEW.advisor_id IS NOT NULL AND NEW.advisor_email IS NOT NULL
     AND btrim(NEW.advisor_email) <> '' AND NEW.advisor_email <> 'advisor@example.com' THEN
    NEW.status := 'pending_advisor';
  ELSE
    NEW.status := 'pending_staff';
  END IF;
  NEW.expires_at := public.add_working_days(now(), 2);
  IF NEW.tracking_token IS NULL THEN NEW.tracking_token := gen_random_uuid(); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.decide_reservation_by_token(_role text, _token uuid, _decision text, _reason text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reservations%ROWTYPE;
BEGIN
  IF _decision NOT IN ('approved','rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_decision');
  END IF;
  IF _role = 'advisor' THEN
    SELECT * INTO r FROM public.reservations WHERE advisor_token = _token LIMIT 1;
  ELSIF _role IN ('ta','staff') THEN
    SELECT * INTO r FROM public.reservations WHERE ta_token = _token LIMIT 1;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'bad_role');
  END IF;
  IF r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF _role = 'advisor' THEN
    IF r.status <> 'pending_advisor'::reservation_status THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_decided', 'stage', r.status::text);
    END IF;
  ELSE
    IF r.status = 'pending_advisor'::reservation_status THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_stage', 'stage', r.status::text);
    ELSIF r.status <> 'pending_staff'::reservation_status THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_decided', 'stage', r.status::text);
    END IF;
  END IF;

  IF _decision = 'rejected' THEN
    UPDATE public.reservations
      SET status='rejected'::reservation_status,
          rejected_stage = _role,
          rejection_reason = _reason,
          advisor_status = CASE WHEN _role='advisor' THEN 'rejected' ELSE advisor_status END,
          advisor_decided_at = CASE WHEN _role='advisor' THEN now() ELSE advisor_decided_at END,
          ta_status = CASE WHEN _role IN ('ta','staff') THEN 'rejected' ELSE ta_status END,
          staff_decided_at = CASE WHEN _role IN ('ta','staff') THEN now() ELSE staff_decided_at END,
          updated_at = now()
      WHERE id = r.id;
    RETURN jsonb_build_object('ok', true, 'final', 'rejected');
  END IF;

  IF _role = 'advisor' THEN
    UPDATE public.reservations
      SET advisor_status='approved', advisor_decided_at=now(),
          status='pending_staff'::reservation_status,
          expires_at = public.add_working_days(now(), 2),
          staff_reminded_at = NULL, updated_at = now()
      WHERE id = r.id;
    RETURN jsonb_build_object('ok', true, 'next', 'pending_staff');
  ELSE
    UPDATE public.reservations
      SET ta_status='approved', staff_decided_at=now(),
          status='pending_admin'::reservation_status,
          expires_at = public.add_working_days(now(), 2),
          admin_reminded_at = NULL, updated_at = now()
      WHERE id = r.id;
    RETURN jsonb_build_object('ok', true, 'next', 'pending_admin');
  END IF;
END $$;
