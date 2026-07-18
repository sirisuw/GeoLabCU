
-- 1. Schema: multi-advisor lab heads + multi-staff responsibility
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS lab_head_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS responsible_staff_ids uuid[] NOT NULL DEFAULT '{}';

-- 2. Rename 223A -> 224A
UPDATE public.rooms SET code='224A' WHERE code='223A';

-- 3. Per-row updates (advisors: full name matches from advisors table)
-- Room 121 EPMA
UPDATE public.rooms SET
  name_en='Electron Probe Micro-Analyzer (EPMA)',
  contact_phone='02-218-5446',
  lab_head_ids = ARRAY['db4d70d8-1e65-4bf8-bf37-d8e02b9ce24f','b9cd4548-462e-4d6e-841c-ebbc1bb190f7']::uuid[],
  responsible_staff_ids = ARRAY['2a61aa8f-295d-477d-ab16-9187065c0ff1']::uuid[]
WHERE code='121';

-- Room 131 Thin Section, Crushing, and Milling
UPDATE public.rooms SET
  name_en='Thin Section, Crushing, and Milling',
  name_th='ห้องตัดหินและบดตัวอย่าง',
  contact_phone='02-218-5440, 02-218-5453',
  lab_head_ids = ARRAY['909780ba-c307-4129-8fa7-5f6af6068600']::uuid[],
  responsible_staff_ids = ARRAY['2c029997-8099-4de0-985d-3b036497433b','9c79afd9-bf72-42af-a365-91fa48390443']::uuid[]
WHERE code='131';

-- Room 224 Sedimentary Lab
UPDATE public.rooms SET
  name_en='Sedimentary Lab',
  contact_phone='02-218-5453',
  lab_head_ids = ARRAY['909780ba-c307-4129-8fa7-5f6af6068600']::uuid[],
  responsible_staff_ids = ARRAY['2c029997-8099-4de0-985d-3b036497433b']::uuid[]
WHERE code='224';

-- Room 224A Advanced Sedimentary Lab
UPDATE public.rooms SET
  name_en='Advanced Sedimentary Lab',
  contact_phone='02-218-5453',
  lab_head_ids = ARRAY['fe119b06-1533-4072-aae1-f8dfd1b46867']::uuid[],
  responsible_staff_ids = ARRAY['2c029997-8099-4de0-985d-3b036497433b']::uuid[]
WHERE code='224A';

-- Room 228 ICP-MS
UPDATE public.rooms SET
  name_en='Inductively Coupled Plasma Mass Spectrometry (ICP-MS)',
  contact_phone='02-218-5453',
  lab_head_ids = ARRAY['e8dda67f-5301-4a93-aa35-9c3805fd463a','c2eb0005-53ca-41df-b2f1-1183dbcb9c8c']::uuid[],
  responsible_staff_ids = ARRAY['2c029997-8099-4de0-985d-3b036497433b']::uuid[]
WHERE code='228';

-- Room 232 TL/OSL
UPDATE public.rooms SET
  name_en='Thermoluminescence / Optically Stimulated Luminescence (TL/OSL)',
  contact_phone='02-218-5443',
  lab_head_ids = ARRAY['c88fb756-cae3-4eb5-a43a-1c4848e7c0b4']::uuid[],
  responsible_staff_ids = ARRAY['2a61aa8f-295d-477d-ab16-9187065c0ff1']::uuid[]
WHERE code='232';

-- Room 234 Advanced Petrographic Microscope
UPDATE public.rooms SET
  name_en='Advanced Petrographic Microscope',
  name_th='กล้องจุลทรรศน์ศิลาวิทยาขั้นสูง',
  contact_phone='02-218-5446',
  lab_head_ids = ARRAY['8954c6e0-6fd3-4905-b9fe-5839388629cb']::uuid[],
  responsible_staff_ids = ARRAY['2a61aa8f-295d-477d-ab16-9187065c0ff1']::uuid[]
WHERE code='234';

-- Room 235 Petrographic Microscope
UPDATE public.rooms SET
  name_en='Petrographic Microscope',
  name_th='กล้องจุลทรรศน์ศิลาวิทยา',
  contact_phone='02-218-5446',
  lab_head_ids = ARRAY['0d7c961e-1c29-4d9e-b38d-34e11d44b647']::uuid[],
  responsible_staff_ids = ARRAY['2a61aa8f-295d-477d-ab16-9187065c0ff1']::uuid[]
WHERE code='235';

-- Room 235H High Temperature Furnace
UPDATE public.rooms SET
  name_en='High Temperature Furnace',
  contact_phone='02-218-5446',
  lab_head_ids = ARRAY['03162449-ab55-4192-8a8a-265f9924b29e']::uuid[],
  responsible_staff_ids = ARRAY['2a61aa8f-295d-477d-ab16-9187065c0ff1']::uuid[]
WHERE code='235H';

-- Room 237 Polishing Lab
UPDATE public.rooms SET
  name_en='Polishing Lab',
  contact_phone='02-218-5446',
  lab_head_ids = ARRAY['0d7c961e-1c29-4d9e-b38d-34e11d44b647']::uuid[],
  responsible_staff_ids = ARRAY['2a61aa8f-295d-477d-ab16-9187065c0ff1']::uuid[]
WHERE code='237';

-- Room 241 Geochemistry Lab
UPDATE public.rooms SET
  name_en='Geochemistry Lab',
  contact_phone='02-218-5453',
  lab_head_ids = ARRAY['a65793a1-a0e6-46b5-9ff9-f558ac6f2730']::uuid[],
  responsible_staff_ids = ARRAY['2c029997-8099-4de0-985d-3b036497433b']::uuid[]
WHERE code='241';

-- Room 242 XRD / XRF Lab
UPDATE public.rooms SET
  name_en='XRD / XRF Lab',
  contact_phone='02-218-5453',
  lab_head_ids = ARRAY['b9cd4548-462e-4d6e-841c-ebbc1bb190f7']::uuid[],
  responsible_staff_ids = ARRAY['2c029997-8099-4de0-985d-3b036497433b']::uuid[]
WHERE code='242';

-- Clear stale legacy text head_of_lab / staff_in_charge (superseded by arrays)
UPDATE public.rooms SET head_of_lab = NULL, staff_in_charge = NULL
WHERE code IN ('121','131','224','224A','228','232','234','235','235H','237','241','242');

-- 4. Public read-only view exposing lab-head names for rooms display
CREATE OR REPLACE VIEW public.rooms_public_heads
WITH (security_invoker = on) AS
SELECT r.id AS room_id, a.id AS advisor_id, a.name_th, a.name_en
FROM public.rooms r
JOIN LATERAL unnest(r.lab_head_ids) AS aid(id) ON true
JOIN public.advisors a ON a.id = aid.id
WHERE r.active = true AND a.active = true;

GRANT SELECT ON public.rooms_public_heads TO anon, authenticated;

-- 5. Trigger: Stage 2 staff emails go ONLY to room's responsible staff (fallback to all active staff)
CREATE OR REPLACE FUNCTION public.enqueue_reservation_emails()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_rec RECORD;
  base_url text := 'https://geoculab.lovable.app';
  details_html text;
  staff_rec RECORD;
  advisor_link text;
  track_link text;
BEGIN
  SELECT r.code, r.name_en, r.responsible_staff_ids INTO room_rec FROM public.rooms r WHERE r.id = NEW.room_id;
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
      || '<p style="margin-top:16px"><a href="' || track_link || '" style="color:#e91e63">ติดตามสถานะ / Track status</a></p>'
      || '</div>');
  ELSIF NEW.status = 'pending_staff' THEN
    FOR staff_rec IN
      SELECT ns.email, ns.name
      FROM public.notification_settings ns
      WHERE ns.role='staff' AND ns.active = true
        AND (
          COALESCE(array_length(room_rec.responsible_staff_ids,1),0) = 0
          OR ns.id = ANY(room_rec.responsible_staff_ids)
        )
    LOOP
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
        || '<p style="margin-top:16px"><a href="' || track_link || '" style="color:#e91e63">ติดตามสถานะ / Track status</a></p>'
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
END $function$;

-- 6. Approvals trigger: Stage 2->3 staff message narrows to room's responsible staff too
CREATE OR REPLACE FUNCTION public.check_reservation_approvals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_url text := 'https://geoculab.lovable.app';
  room_rec RECORD; details_html text; admin_rec RECORD; staff_rec RECORD;
  track_link text; advisor_line text;
BEGIN
  SELECT code, name_en, responsible_staff_ids INTO room_rec FROM public.rooms WHERE id = NEW.room_id;
  details_html := public.render_reservation_details(NEW, room_rec.code, room_rec.name_en);
  track_link := base_url || '/status/' || NEW.tracking_token::text;
  advisor_line := CASE
    WHEN NEW.advisor_decided_at IS NOT NULL AND NEW.advisor_status='approved'
    THEN '<p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:8px 12px">อนุมัติโดยอาจารย์ ' || COALESCE(NEW.advisor_name,'-') ||
         ' เมื่อ ' || to_char(NEW.advisor_decided_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') ||
         '<br>Approved by advisor ' || COALESCE(NEW.advisor_name,'-') || '</p>'
    ELSE '' END;

  IF NEW.status='pending_staff'::reservation_status AND OLD.status='pending_advisor'::reservation_status THEN
    FOR staff_rec IN
      SELECT ns.email, ns.name FROM public.notification_settings ns
      WHERE ns.role='staff' AND ns.active=true
        AND (
          COALESCE(array_length(room_rec.responsible_staff_ids,1),0) = 0
          OR ns.id = ANY(room_rec.responsible_staff_ids)
        )
    LOOP
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
END $function$;

-- 7. Maintenance: staff reminder narrows to room's responsible staff too
CREATE OR REPLACE FUNCTION public.run_reservation_maintenance()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n_expired int := 0; n_completed int := 0; rec RECORD; room_rec RECORD;
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
    SELECT responsible_staff_ids INTO room_rec FROM public.rooms WHERE id = rec.room_id;
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    SELECT rec.id, ns.email,
      '[GeoCU Lab] เตือน: รออนุมัติจากเจ้าหน้าที่ / Reminder — Staff approval pending',
      'staff-reminder',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2>เตือนการอนุมัติ / Approval Reminder</h2>'
      || '<p>คำขอจะหมดอายุใน ~24 ชั่วโมง / Will expire in ~24h.</p>'
      || '<p><a href="' || base_url || '/approve/ta/' || rec.ta_token::text || '" style="background:#e91e63;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">เปิดคำขอ / Open</a></p></div>'
    FROM public.notification_settings ns
    WHERE ns.role='staff' AND ns.active=true
      AND (
        COALESCE(array_length(room_rec.responsible_staff_ids,1),0) = 0
        OR ns.id = ANY(room_rec.responsible_staff_ids)
      );
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
END $function$;
