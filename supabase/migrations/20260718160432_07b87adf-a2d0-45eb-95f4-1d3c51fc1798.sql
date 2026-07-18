
DROP FUNCTION IF EXISTS public.get_reservation_by_token(text, uuid);
DROP FUNCTION IF EXISTS public.decide_reservation_by_token(text, uuid, text);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS tracking_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS advisor_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_reminded_at   timestamptz,
  ADD COLUMN IF NOT EXISTS admin_reminded_at   timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_stage      text,
  ADD COLUMN IF NOT EXISTS rejection_reason    text,
  ADD COLUMN IF NOT EXISTS staff_decided_at    timestamptz,
  ADD COLUMN IF NOT EXISTS staff_decided_by    text;

CREATE INDEX IF NOT EXISTS idx_reservations_tracking_token ON public.reservations (tracking_token);

CREATE OR REPLACE FUNCTION public.set_reservation_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  NEW.expires_at := now() + INTERVAL '48 hours';
  IF NEW.tracking_token IS NULL THEN NEW.tracking_token := gen_random_uuid(); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_reservation_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_rec RECORD;
  base_url text := 'https://geoculab.lovable.app';
  details_html text;
  staff_rec RECORD;
  advisor_link text;
  track_link text;
BEGIN
  SELECT r.code, r.name_en INTO room_rec FROM public.rooms r WHERE r.id = NEW.room_id;
  details_html := public.render_reservation_details(NEW, room_rec.code, room_rec.name_en);
  track_link := base_url || '/status/' || NEW.tracking_token::text;

  IF NEW.status = 'pending_advisor' THEN
    advisor_link := base_url || '/approve/advisor/' || NEW.advisor_token::text;
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.advisor_email,
      '[GeoCU Lab] ขอความเห็นชอบอาจารย์ที่ปรึกษา / Advisor endorsement — ' || room_rec.code,
      'advisor-endorsement',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#0b3d2e">ขอความเห็นชอบจากอาจารย์ที่ปรึกษา<br>Advisor Endorsement Request</h2>'
      || '<p>เรียน ' || COALESCE(NEW.advisor_name,'อาจารย์') || ',</p>'
      || '<p><b>คุณเป็นผู้อนุมัติลำดับแรก / You are the first approver in the chain.</b></p>'
      || details_html
      || '<p><a href="' || advisor_link || '?decision=approved" style="background:#16a34a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:10px">✓ อนุมัติ / Approve</a>'
      || '<a href="' || advisor_link || '?decision=rejected" style="background:#dc2626;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">✗ ปฏิเสธ / Deny</a></p>'
      || '</div>');
  ELSIF NEW.status = 'pending_staff' THEN
    FOR staff_rec IN SELECT email, name FROM public.notification_settings WHERE role='staff' AND active = true LOOP
      INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
      VALUES (NEW.id, staff_rec.email,
        '[GeoCU Lab] คำขอจองใหม่ / New booking — ' || room_rec.code,
        'staff-approval',
        '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
        || '<h2 style="color:#0b3d2e">คำขอจองห้องปฏิบัติการ / Laboratory Reservation Request</h2>'
        || '<p>เรียน ' || staff_rec.name || ',</p>'
        || '<p>มีคำขอจองใหม่รอการอนุมัติจากคุณ (ไม่ผ่านอาจารย์ที่ปรึกษา)<br>New request awaiting your approval (no advisor step).</p>'
        || details_html
        || '<p><a href="' || base_url || '/approve/ta/' || NEW.ta_token::text || '?decision=approved" style="background:#16a34a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:10px">✓ อนุมัติ / Approve</a>'
        || '<a href="' || base_url || '/approve/ta/' || NEW.ta_token::text || '?decision=rejected" style="background:#dc2626;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">✗ ปฏิเสธ / Deny</a></p>'
        || '</div>');
    END LOOP;
  END IF;

  INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
  VALUES (NEW.id, NEW.requester_email,
    '[GeoCU Lab] ได้รับคำขอจองแล้ว / Reservation received — ' || room_rec.code,
    'requester-received',
    '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
    || '<h2 style="color:#0b3d2e">ได้รับคำขอจองห้องปฏิบัติการแล้ว / Reservation Received</h2>'
    || '<p>เรียน ' || COALESCE(NEW.requester_name,'') || ',</p>'
    || '<p>ระบบได้รับคำขอของคุณแล้ว โปรดใช้ลิงก์ด้านล่างเพื่อติดตามสถานะ<br>We received your request. Use the link below to track its status.</p>'
    || details_html
    || '<p><a href="' || track_link || '" style="background:#e91e63;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">ติดตามสถานะคำขอ / Track status</a></p>'
    || '</div>');
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.decide_reservation_by_token(
  _role text, _token uuid, _decision text, _reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
          expires_at = now() + INTERVAL '48 hours',
          staff_reminded_at = NULL, updated_at = now()
      WHERE id = r.id;
    RETURN jsonb_build_object('ok', true, 'next', 'pending_staff');
  ELSE
    UPDATE public.reservations
      SET ta_status='approved', staff_decided_at=now(),
          status='pending_admin'::reservation_status,
          expires_at = now() + INTERVAL '48 hours',
          admin_reminded_at = NULL, updated_at = now()
      WHERE id = r.id;
    RETURN jsonb_build_object('ok', true, 'next', 'pending_admin');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.decide_reservation_by_token(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_reservation_by_token(text, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_reservation_approvals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_url text := 'https://geoculab.lovable.app';
  room_rec RECORD; details_html text; admin_rec RECORD; staff_rec RECORD;
  track_link text; advisor_line text;
BEGIN
  SELECT code, name_en INTO room_rec FROM public.rooms WHERE id = NEW.room_id;
  details_html := public.render_reservation_details(NEW, room_rec.code, room_rec.name_en);
  track_link := base_url || '/status/' || NEW.tracking_token::text;
  advisor_line := CASE
    WHEN NEW.advisor_decided_at IS NOT NULL AND NEW.advisor_status='approved'
    THEN '<p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:8px 12px">อนุมัติโดยอาจารย์ ' || COALESCE(NEW.advisor_name,'-') ||
         ' เมื่อ ' || to_char(NEW.advisor_decided_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') ||
         '<br>Approved by advisor ' || COALESCE(NEW.advisor_name,'-') || '</p>'
    ELSE '' END;

  IF NEW.status='pending_staff'::reservation_status AND OLD.status='pending_advisor'::reservation_status THEN
    FOR staff_rec IN SELECT email, name FROM public.notification_settings WHERE role='staff' AND active=true LOOP
      INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
      VALUES (NEW.id, staff_rec.email,
        '[GeoCU Lab] คำขอจองรออนุมัติ / Awaiting staff approval — ' || room_rec.code,
        'staff-approval',
        '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
        || '<h2 style="color:#0b3d2e">รอการอนุมัติจากเจ้าหน้าที่ห้องปฏิบัติการ / Awaiting Lab Staff Approval</h2>'
        || '<p>เรียน ' || staff_rec.name || ',</p>' || advisor_line || details_html
        || '<p><a href="' || base_url || '/approve/ta/' || NEW.ta_token::text || '?decision=approved" style="background:#16a34a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:10px">✓ อนุมัติ / Approve</a>'
        || '<a href="' || base_url || '/approve/ta/' || NEW.ta_token::text || '?decision=rejected" style="background:#dc2626;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">✗ ปฏิเสธ / Deny</a></p>'
        || '</div>');
    END LOOP;
  END IF;

  IF NEW.status='pending_admin'::reservation_status AND OLD.status='pending_staff'::reservation_status THEN
    FOR admin_rec IN SELECT email, name FROM public.notification_settings WHERE role='admin' AND active=true LOOP
      INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
      VALUES (NEW.id, admin_rec.email,
        '[GeoCU Lab] รอการยืนยันขั้นสุดท้าย / Awaiting final approval',
        'admin-approval-request',
        '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
        || '<h2 style="color:#0b3d2e">รอการยืนยันขั้นสุดท้าย / Awaiting Final Approval</h2>'
        || advisor_line
        || '<p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:8px 12px">อนุมัติโดยเจ้าหน้าที่เมื่อ '
        || COALESCE(to_char(NEW.staff_decided_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI'),'-') || '</p>'
        || details_html
        || '<p><a href="' || base_url || '/admin" style="background:#0b3d2e;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">เปิดหน้าผู้ดูแล / Open Admin</a></p>'
        || '</div>');
    END LOOP;
  END IF;

  IF NEW.status='rejected'::reservation_status AND OLD.status <> 'rejected'::reservation_status THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] คำขอถูกปฏิเสธ / Request rejected',
      'requester-rejection',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#b91c1c">คำขอจองห้องถูกปฏิเสธ / Reservation Rejected</h2>'
      || '<p><b>ปฏิเสธในขั้นตอน / Rejected at stage:</b> ' || COALESCE(NEW.rejected_stage,'-') || '</p>'
      || CASE WHEN NEW.rejection_reason IS NOT NULL AND btrim(NEW.rejection_reason) <> ''
              THEN '<p><b>เหตุผล / Reason:</b> ' || NEW.rejection_reason || '</p>' ELSE '' END
      || details_html
      || '<p><a href="' || track_link || '" style="color:#e91e63">ดูรายละเอียด / View status</a></p>'
      || '<p><a href="' || base_url || '/reserve" style="background:#0b3d2e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">จองใหม่ / Submit new request</a></p>'
      || '</div>');
  END IF;

  IF NEW.status IN ('confirmed'::reservation_status,'approved'::reservation_status)
     AND OLD.status NOT IN ('confirmed'::reservation_status,'approved'::reservation_status) THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] ยืนยันการจอง / Reservation confirmed',
      'requester-confirmation',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#16a34a">✓ ยืนยันการจองห้องปฏิบัติการ / Reservation Confirmed</h2>'
      || details_html
      || '<p style="background:#f0fdf4;border:1px solid #16a34a;padding:12px;border-radius:6px"><b>Request ID:</b> ' || NEW.id::text
      || '<br><b>แสดงอีเมลนี้ที่ห้องปฏิบัติการ / Show this email at the lab</b></p>'
      || '<p><a href="' || track_link || '" style="color:#e91e63">ติดตามสถานะ / Track status</a></p>'
      || '</div>');
  END IF;

  IF NEW.status='expired'::reservation_status
     AND OLD.status IN ('pending','pending_advisor','pending_staff','pending_admin','pending_ta_advisor','ta_approved') THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] คำขอหมดอายุ / Request expired',
      'requester-expired',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2>คำขอหมดอายุ / Request Expired</h2>'
      || '<p>คำขอไม่ได้รับการพิจารณาในเวลาที่กำหนด โปรดยื่นคำขอใหม่<br>Your request was not reviewed in time.</p>'
      || '<p><a href="' || base_url || '/reserve" style="background:#0b3d2e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">จองใหม่ / Rebook</a></p>'
      || '</div>');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_reservation_by_tracking_token(_token uuid)
RETURNS TABLE(
  id uuid, status text, rejected_stage text, rejection_reason text,
  advisor_name text, advisor_status text, advisor_decided_at timestamptz,
  ta_status text, staff_decided_at timestamptz, admin_decided_at timestamptz,
  created_at timestamptz, expires_at timestamptz, start_at timestamptz, end_at timestamptz,
  purpose text, attendees int, equipment text,
  room_code text, room_name_en text, room_name_th text,
  requester_name text, has_advisor boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.status::text, r.rejected_stage, r.rejection_reason,
         r.advisor_name, r.advisor_status, r.advisor_decided_at,
         r.ta_status, r.staff_decided_at, r.completed_at as admin_decided_at,
         r.created_at, r.expires_at, r.start_at, r.end_at,
         r.purpose, r.attendees, r.equipment,
         rm.code, rm.name_en, rm.name_th,
         r.requester_name,
         (r.advisor_id IS NOT NULL AND r.advisor_email IS NOT NULL
          AND btrim(r.advisor_email) <> '' AND r.advisor_email <> 'advisor@example.com') AS has_advisor
  FROM public.reservations r
  LEFT JOIN public.rooms rm ON rm.id = r.room_id
  WHERE r.tracking_token = _token;
$$;
REVOKE ALL ON FUNCTION public.get_reservation_by_tracking_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reservation_by_tracking_token(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_reservation_by_token(_role text, _token uuid)
RETURNS TABLE(
  id uuid, requester_name text, requester_email text, purpose text,
  start_at timestamptz, end_at timestamptz, attendees integer,
  advisor_name text, ta_status text, advisor_status text, status text,
  advisor_decided_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.requester_name, r.requester_email, r.purpose,
         r.start_at, r.end_at, r.attendees, r.advisor_name,
         r.ta_status, r.advisor_status, r.status::text, r.advisor_decided_at
  FROM public.reservations r
  WHERE (_role = 'advisor' AND r.advisor_token = _token)
     OR (_role IN ('ta','staff') AND r.ta_token = _token)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_reservation_by_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reservation_by_token(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_reservation_maintenance()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_expired int := 0; n_completed int := 0; rec RECORD;
  base_url text := 'https://geoculab.lovable.app';
BEGIN
  UPDATE public.reservations SET status='expired'::reservation_status
   WHERE status IN ('pending','pending_advisor','pending_staff','pending_admin','pending_ta_advisor','ta_approved')
     AND expires_at IS NOT NULL AND now() > expires_at;
  GET DIAGNOSTICS n_expired = ROW_COUNT;
  UPDATE public.reservations SET status='completed'::reservation_status, completed_at=now()
   WHERE status='confirmed'::reservation_status AND end_at < now();
  GET DIAGNOSTICS n_completed = ROW_COUNT;

  FOR rec IN SELECT * FROM public.reservations
     WHERE status='pending_advisor'::reservation_status
       AND advisor_reminded_at IS NULL
       AND now() > (created_at + INTERVAL '24 hours')
       AND advisor_email IS NOT NULL
  LOOP
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (rec.id, rec.advisor_email,
      '[GeoCU Lab] เตือน: รออนุมัติจากอาจารย์ที่ปรึกษา / Reminder — Advisor approval pending',
      'advisor-reminder',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2>เตือนการอนุมัติ / Approval Reminder</h2>'
      || '<p>คำขอจะหมดอายุใน ~24 ชั่วโมง / Will expire in ~24h.</p>'
      || '<p><a href="' || base_url || '/approve/advisor/' || rec.advisor_token::text || '" style="background:#e91e63;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">เปิดคำขอ / Open</a></p></div>');
    UPDATE public.reservations SET advisor_reminded_at = now() WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT r.* FROM public.reservations r
     WHERE r.status='pending_staff'::reservation_status
       AND r.staff_reminded_at IS NULL
       AND now() > (COALESCE(r.advisor_decided_at, r.created_at) + INTERVAL '24 hours')
  LOOP
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    SELECT rec.id, ns.email,
      '[GeoCU Lab] เตือน: รออนุมัติจากเจ้าหน้าที่ / Reminder — Staff approval pending',
      'staff-reminder',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2>เตือนการอนุมัติ / Approval Reminder</h2>'
      || '<p>คำขอจะหมดอายุใน ~24 ชั่วโมง / Will expire in ~24h.</p>'
      || '<p><a href="' || base_url || '/approve/ta/' || rec.ta_token::text || '" style="background:#e91e63;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">เปิดคำขอ / Open</a></p></div>'
    FROM public.notification_settings ns WHERE ns.role='staff' AND ns.active=true;
    UPDATE public.reservations SET staff_reminded_at = now() WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT r.* FROM public.reservations r
     WHERE r.status='pending_admin'::reservation_status
       AND r.admin_reminded_at IS NULL
       AND now() > (COALESCE(r.staff_decided_at, r.created_at) + INTERVAL '24 hours')
  LOOP
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    SELECT rec.id, ns.email,
      '[GeoCU Lab] เตือน: รอการยืนยันขั้นสุดท้าย / Reminder — Admin approval pending',
      'admin-reminder',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2>เตือนการอนุมัติ / Approval Reminder</h2>'
      || '<p>โปรดพิจารณาในหน้าผู้ดูแล / Please review in the admin dashboard.</p>'
      || '<p><a href="' || base_url || '/admin" style="background:#e91e63;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">เปิดหน้าผู้ดูแล / Open admin</a></p></div>'
    FROM public.notification_settings ns WHERE ns.role='admin' AND ns.active=true;
    UPDATE public.reservations SET admin_reminded_at = now() WHERE id = rec.id;
  END LOOP;

  RETURN n_expired + n_completed;
END $$;
