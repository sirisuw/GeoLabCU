
-- 1. user_roles.officer_group column
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS officer_group public.officer_group;

-- 2. rooms: officer_group + flow_type
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS officer_group public.officer_group DEFAULT 'none' NOT NULL,
  ADD COLUMN IF NOT EXISTS flow_type public.flow_type DEFAULT 'equipment' NOT NULL;

UPDATE public.rooms SET officer_group='sopit' WHERE code IN ('121','225A','226C','228','232','234','235','235H','237');
UPDATE public.rooms SET officer_group='kanchalika' WHERE code IN ('131','223A','224','241','242');
UPDATE public.rooms SET officer_group='wiyada' WHERE code IN ('130');
UPDATE public.rooms SET officer_group='none' WHERE code IN ('225B','325','326','325A','424');

UPDATE public.rooms SET flow_type='computer' WHERE code='325A';
UPDATE public.rooms SET flow_type='classroom' WHERE code IN ('325','326','424');

-- 3. reservations: new columns
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS flow_type public.flow_type,
  ADD COLUMN IF NOT EXISTS equipment_selected jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS ta_note text,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS professor_endorsement text DEFAULT 'none' NOT NULL,
  ADD COLUMN IF NOT EXISTS professor_note text,
  ADD COLUMN IF NOT EXISTS no_show boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.reservations r SET flow_type = rm.flow_type FROM public.rooms rm
  WHERE r.room_id = rm.id AND r.flow_type IS NULL;

UPDATE public.reservations SET expires_at = created_at + INTERVAL '48 hours' WHERE expires_at IS NULL;

-- 4. equipment_maintenance
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equipment_maintenance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_maintenance TO authenticated;
GRANT ALL ON public.equipment_maintenance TO service_role;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maint_public_read" ON public.equipment_maintenance;
CREATE POLICY "maint_public_read" ON public.equipment_maintenance FOR SELECT USING (true);

DROP POLICY IF EXISTS "maint_staff_write" ON public.equipment_maintenance;
CREATE POLICY "maint_staff_write" ON public.equipment_maintenance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'lab_officer'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'lab_officer'::app_role));

CREATE INDEX IF NOT EXISTS idx_maint_active ON public.equipment_maintenance(room_id, equipment_name) WHERE ended_at IS NULL;

DROP TRIGGER IF EXISTS trg_maint_updated_at ON public.equipment_maintenance;
CREATE TRIGGER trg_maint_updated_at BEFORE UPDATE ON public.equipment_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. no_show_counters
CREATE TABLE IF NOT EXISTS public.no_show_counters (
  student_id text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  last_no_show_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.no_show_counters TO authenticated;
GRANT ALL ON public.no_show_counters TO service_role;
ALTER TABLE public.no_show_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "noshow_staff_read" ON public.no_show_counters;
CREATE POLICY "noshow_staff_read" ON public.no_show_counters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'lab_officer'::app_role) OR public.has_role(auth.uid(),'ta'::app_role));

-- 6. Helpers
CREATE OR REPLACE FUNCTION public.can_manage_room(_user_id uuid, _room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user_id,'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.user_roles ur
      ON ur.user_id=_user_id
     AND (ur.role='ta'::app_role OR ur.role='lab_officer'::app_role)
     AND ur.officer_group = r.officer_group
    WHERE r.id=_room_id AND r.officer_group <> 'none'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_room(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_room(uuid,uuid) TO authenticated;

-- 7. Validation trigger
CREATE OR REPLACE FUNCTION public.validate_reservation_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
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
      SELECT EXISTS (
        SELECT 1 FROM public.reservations r
        WHERE r.room_id = NEW.room_id
          AND r.id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
          AND r.status IN ('pending'::reservation_status,'ta_approved'::reservation_status,'confirmed'::reservation_status,'approved'::reservation_status)
          AND r.start_at < NEW.end_at AND r.end_at > NEW.start_at
          AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.equipment_selected) e2 WHERE e2->>'name' = eq_name)
      ) INTO overlap_exists;
      IF overlap_exists THEN RAISE EXCEPTION 'Equipment "%" already booked for that time', eq_name; END IF;

      IF EXISTS (SELECT 1 FROM public.equipment_maintenance m
                 WHERE m.room_id = NEW.room_id AND m.equipment_name = eq_name AND m.ended_at IS NULL) THEN
        RAISE EXCEPTION 'Equipment "%" is under maintenance', eq_name;
      END IF;
    END LOOP;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.room_id = NEW.room_id
        AND r.id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
        AND r.status IN ('pending'::reservation_status,'ta_approved'::reservation_status,'confirmed'::reservation_status,'approved'::reservation_status)
        AND r.start_at < NEW.end_at AND r.end_at > NEW.start_at
    ) INTO overlap_exists;
    IF overlap_exists THEN RAISE EXCEPTION 'Room already booked for that time'; END IF;
  END IF;

  IF TG_OP='INSERT' THEN
    NEW.status := 'pending';
    NEW.expires_at := now() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_reservation ON public.reservations;
DROP TRIGGER IF EXISTS trg_validate_reservation_rules ON public.reservations;
CREATE TRIGGER trg_validate_reservation_rules
  BEFORE INSERT OR UPDATE OF start_at, end_at, equipment_selected, room_id
  ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.validate_reservation_rules();

DROP TRIGGER IF EXISTS trg_set_reservation_defaults ON public.reservations;

-- 8. Rewritten email routing (new-request notification)
CREATE OR REPLACE FUNCTION public.enqueue_reservation_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE room_rec RECORD; base_url text := 'https://geoculab.lovable.app'; advisor_link text;
BEGIN
  SELECT r.code, r.name_en, r.officer_group INTO room_rec FROM public.rooms r WHERE r.id = NEW.room_id;
  advisor_link := base_url || '/approve/advisor/' || NEW.advisor_token::text;

  INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
  SELECT NEW.id, COALESCE(rs.email,'unassigned@example.com'),
    '[GeoCU Lab] New Request — Rm ' || room_rec.code || ' — ' || COALESCE(NEW.requester_name,''),
    'ta-new-request',
    '<p>New reservation from <b>' || COALESCE(NEW.requester_name,'') || '</b> for room ' || room_rec.code || ' (' || room_rec.name_en || ').</p>'
    || '<p>Purpose: ' || COALESCE(NEW.purpose,'') || '</p>'
    || '<p>Start: ' || NEW.start_at::text || '<br>End: ' || NEW.end_at::text || '</p>'
    || '<p>Review in TA dashboard: <a href="' || base_url || '/ta">' || base_url || '/ta</a></p>'
  FROM public.rooms rm LEFT JOIN public.room_staff rs ON rs.room_id = rm.id WHERE rm.id = NEW.room_id;

  IF NEW.advisor_name IS NOT NULL AND NEW.flow_type <> 'computer' THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, COALESCE(NEW.advisor_email,'advisor@example.com'),
      '[GeoCU Lab] Endorsement request — Rm ' || room_rec.code, 'advisor-endorsement',
      '<p>Your student <b>' || COALESCE(NEW.requester_name,'') || '</b> has requested to reserve ' || room_rec.code || ' (' || room_rec.name_en || ').</p>'
      || '<p>Optionally endorse or flag concerns: <a href="' || advisor_link || '">Review</a></p>');
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_enqueue_reservation_emails ON public.reservations;
CREATE TRIGGER trg_enqueue_reservation_emails AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_reservation_emails();

-- 9. Approvals trigger (2-stage)
CREATE OR REPLACE FUNCTION public.check_reservation_approvals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='rejected'::reservation_status AND OLD.status <> 'rejected'::reservation_status THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] Request #' || substr(NEW.id::text,1,8) || ' rejected', 'requester-rejection',
      '<p>Your reservation request has been rejected.</p>'
      || CASE WHEN COALESCE(NEW.admin_note, NEW.ta_note) IS NOT NULL
         THEN '<p>Reason: ' || COALESCE(NEW.admin_note, NEW.ta_note) || '</p>' ELSE '' END);
  END IF;

  IF NEW.status='ta_approved'::reservation_status AND OLD.status='pending'::reservation_status THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, 'admin@example.com',
      '[GeoCU Lab] Request #' || substr(NEW.id::text,1,8) || ' awaiting final approval', 'admin-approval-request',
      '<p>Approved by TA. Please give final confirmation in the admin dashboard.</p>');
  END IF;

  IF NEW.status='confirmed'::reservation_status AND OLD.status <> 'confirmed'::reservation_status THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] Request #' || substr(NEW.id::text,1,8) || ' confirmed', 'requester-confirmation',
      '<p>Your reservation is confirmed. Show this email or your Request ID at the lab.</p><p>Request ID: <b>' || NEW.id::text || '</b></p>');
  END IF;

  IF NEW.status='expired'::reservation_status AND OLD.status='pending'::reservation_status THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] Request expired — please rebook', 'requester-expired',
      '<p>Your reservation request was not reviewed within 48 hours and has expired. Please submit a new request.</p>');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_check_reservation_approvals ON public.reservations;
CREATE TRIGGER trg_check_reservation_approvals BEFORE UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_reservation_approvals();

DROP TRIGGER IF EXISTS trg_notify_requester_on_admin ON public.reservations;

-- 10. No-show counter
CREATE OR REPLACE FUNCTION public.bump_no_show_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='no_show'::reservation_status AND OLD.status <> 'no_show'::reservation_status AND NEW.student_id IS NOT NULL THEN
    INSERT INTO public.no_show_counters(student_id, count, last_no_show_at)
    VALUES (NEW.student_id, 1, now())
    ON CONFLICT (student_id) DO UPDATE SET count = no_show_counters.count + 1, last_no_show_at = now(), updated_at = now();
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bump_no_show ON public.reservations;
CREATE TRIGGER trg_bump_no_show AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.bump_no_show_counter();

-- 11. Reservation maintenance sweep
CREATE OR REPLACE FUNCTION public.run_reservation_maintenance()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n1 int; n2 int;
BEGIN
  UPDATE public.reservations SET status='expired'::reservation_status
    WHERE status='pending'::reservation_status AND expires_at IS NOT NULL AND now() > expires_at;
  GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE public.reservations SET status='completed'::reservation_status, completed_at=now()
    WHERE status='confirmed'::reservation_status AND end_at < now();
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END; $$;
REVOKE EXECUTE ON FUNCTION public.run_reservation_maintenance() FROM PUBLIC, anon, authenticated;

-- 12. RLS: TA/officer can read+update their group's reservations
DROP POLICY IF EXISTS "reservations_staff_read" ON public.reservations;
CREATE POLICY "reservations_staff_read" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.can_manage_room(auth.uid(), room_id));

DROP POLICY IF EXISTS "reservations_staff_update" ON public.reservations;
CREATE POLICY "reservations_staff_update" ON public.reservations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.can_manage_room(auth.uid(), room_id))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.can_manage_room(auth.uid(), room_id));
