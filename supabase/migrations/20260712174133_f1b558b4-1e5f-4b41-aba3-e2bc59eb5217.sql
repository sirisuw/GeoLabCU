
-- =========================================================
-- 1. Advisors table
-- =========================================================
CREATE TABLE public.advisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th text NOT NULL,
  name_en text NOT NULL,
  email text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advisors TO anon, authenticated;
GRANT ALL ON public.advisors TO service_role, authenticated;
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active advisors" ON public.advisors FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage advisors" ON public.advisors FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_advisors_updated BEFORE UPDATE ON public.advisors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.advisors (name_th, name_en, email, sort_order) VALUES
('ศ.ดร.มนตรี ชูวงษ์','Prof. Dr. Montri Choowong','monkeng@hotmail.com',1),
('ศ.ดร.จักรพันธ์ สุทธิรัตน์','Prof. Dr. Chakkaphan Sutthirat','c.sutthirat@gmail.com',2),
('ศ.ดร.พิษณุพงศ์ กาญจนพยนต์','Prof. Dr. Pitsanupong Kanjanapayont','pitsanupong.k@hotmail.com',3),
('ศ.ดร.ศรีเลิศ โชติพันธรัตน์','Prof. Dr. Srilert Chotpantarat','csrilert@gmail.com',4),
('รศ.ดร.ฐาสิณีย์ เจริญฐิติรัตน์','Assoc. Prof. Dr. Thasinee Charoentitirat','thasineec@gmail.com',5),
('ศ.ดร.สันติ ภัยหลบลี้','Prof. Dr. Santi Pailoplee','Pailoplee.S@hotmail.com',6),
('รศ.ดร.ฐานบ ธิติมากร','Assoc. Prof. Dr. Thanop Thitimakorn','thanop.t@chula.ac.th',7),
('ผศ.ดร.วิชัย จูฑะโกสิทธิ์กานนท์','Asst. Prof. Dr. Vichai Chutakositkanon','vichaic@yahoo.com',8),
('รศ.ดร.อัคนีวุธ จิรภิญญากุล','Assoc. Prof. Dr. Akkaneewut Jirapinyakul','akkaneewut@gmail.com',9),
('รศ.ดร.ปิยพงษ์ เชนร้าย','Assoc. Prof. Dr. Piyaphong Chenrai','Piyaphong.C@chula.ac.th',10),
('ผศ.ดร.สุเมธ พันธุวงค์ราช','Asst. Prof. Dr. Sumet Phantuwongraj','phantuwongraj.s@gmail.com',11),
('รศ.ดร.สุคนธ์เมธ จิตรมหันตกุล','Assoc. Prof. Dr. Sukonmeth Jitmahantakul','sukonmeth.j@chula.ac.th',12),
('รศ.ดร.สกลวรรณ ชาวไชย','Assoc. Prof. Dr. Sakonvan Chawchai','sakonvan.c@chula.ac.th',13),
('รศ.ดร.กันตภณ สุระประสิทธิ์','Assoc. Prof. Dr. Kantapon Suraprasit','Kantapon.S@chula.ac.th',14),
('รศ.ดร.ฐิติพรรณ อัศวินเจริญกิจ','Assoc. Prof. Dr. Thitiphan Assawincharoenkij','Thitiphan.A@chula.ac.th',15),
('รศ.ดร.อลงกต ฝั้นกา','Assoc. Prof. Dr. Alongkot Fanka','Alongkot.F@chula.ac.th',16),
('อ.ดร.พงศ์เทพ ทองแสง','Dr. Pongthep Thongsang','Pongthep.T@chula.ac.th',17),
('อ.ดร.สิรวิชญ์ แก้วผลึก','Dr. Sirawit Kaewpaluk','Sirawit.K@chula.ac.th',18),
('อ.ดร.ศิรวัชร์ อุดมศักดิ์','Dr. Sirawat Udomsak','Sirawat.U@chula.ac.th',19),
('อ.ดร.ภคิน อัศวภาณุวัฒน์','Dr. Prakhin Assavapanuvat','Prakhin.A@chula.ac.th',20),
('อ.ดร.บุญฑิกานต์ คูหาสรรพสิน','Dr. Boontigan Kuhasubpasin','Boontigan.K@chula.ac.th',21);

-- =========================================================
-- 2. Notification settings (staff + admin recipients)
-- =========================================================
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('staff','admin')),
  name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification settings" ON public.notification_settings FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_notif_updated BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.notification_settings (role, name, email) VALUES
('staff','คุณวิยดา','Viyada.l@chula.ac.th'),
('staff','คุณโศภิต','Sopit.p@chula.ac.th'),
('staff','คุณกัญชลิกา','Kunchalika.t@chula.ac.th');
-- Admin email row (inactive by default; admin sets it via the settings page)
INSERT INTO public.notification_settings (role, name, email, active) VALUES
('admin','ผู้ดูแลระบบ / Admin','admin@example.com', false);

-- =========================================================
-- 3. advisor_id on reservations
-- =========================================================
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS advisor_id uuid REFERENCES public.advisors(id) ON DELETE SET NULL;

-- =========================================================
-- 4. Rewrite trigger: set defaults (no more ta@example.com)
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_reservation_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE adv_email text;
BEGIN
  IF NEW.advisor_id IS NOT NULL THEN
    SELECT email INTO adv_email FROM public.advisors WHERE id = NEW.advisor_id;
    IF adv_email IS NOT NULL AND btrim(adv_email) <> '' THEN
      NEW.advisor_email := adv_email;
    END IF;
  END IF;
  NEW.status := 'pending_ta_advisor';
  RETURN NEW;
END $$;

-- =========================================================
-- 5. Bilingual email helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.render_reservation_details(r public.reservations, room_code text, room_name text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin:16px 0;width:100%;max-width:560px">'
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;width:180px"><b>Student / นักศึกษา</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || COALESCE(r.requester_name,'-') || '</td></tr>'
    || CASE WHEN r.student_id IS NOT NULL THEN '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>Student ID</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || r.student_id || '</td></tr>' ELSE '' END
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>Room / ห้อง</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || room_code || ' — ' || room_name || '</td></tr>'
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>Equipment / อุปกรณ์</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || COALESCE(r.equipment,'-') || '</td></tr>'
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>Start / เริ่ม</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || to_char(r.start_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') || ' (Asia/Bangkok)</td></tr>'
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>End / สิ้นสุด</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || to_char(r.end_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI') || ' (Asia/Bangkok)</td></tr>'
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>Samples / จำนวนตัวอย่าง</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || COALESCE(r.sample_count,'-') || '</td></tr>'
    || '<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb"><b>Purpose / วัตถุประสงค์</b></td><td style="padding:6px 10px;border:1px solid #e5e7eb">' || COALESCE(r.purpose,'-') || '</td></tr>'
    || '</table>';
$$;

-- =========================================================
-- 6. Rewrite enqueue_reservation_emails: fan out to all staff + selected advisor
-- =========================================================
CREATE OR REPLACE FUNCTION public.enqueue_reservation_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room_rec RECORD;
  base_url text := 'https://geoculab.lovable.app';
  approve_link text;
  deny_link text;
  advisor_link text;
  details_html text;
  staff_rec RECORD;
BEGIN
  SELECT r.code, r.name_en INTO room_rec FROM public.rooms r WHERE r.id = NEW.room_id;
  details_html := public.render_reservation_details(NEW, room_rec.code, room_rec.name_en);
  approve_link := base_url || '/approve/ta/' || NEW.ta_token::text || '?decision=approved';
  deny_link    := base_url || '/approve/ta/' || NEW.ta_token::text || '?decision=rejected';

  -- One email per active staff member
  FOR staff_rec IN SELECT email, name FROM public.notification_settings WHERE role='staff' AND active = true LOOP
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (
      NEW.id, staff_rec.email,
      '[GeoCU Lab] คำขอจองใหม่ / New booking — ' || room_rec.code || ' — ' || COALESCE(NEW.requester_name,''),
      'staff-approval',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#0b3d2e">คำขอจองห้องปฏิบัติการ / Laboratory Reservation Request</h2>'
      || '<p>เรียน ' || staff_rec.name || ',<br>Dear ' || staff_rec.name || ',</p>'
      || '<p>มีคำขอจองใหม่รอการอนุมัติจากคุณ<br>A new reservation request is awaiting your approval.</p>'
      || details_html
      || '<p style="margin-top:20px">'
      || '<a href="' || approve_link || '" style="background:#16a34a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:10px">✓ อนุมัติ / Approve</a>'
      || '<a href="' || deny_link || '" style="background:#dc2626;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">✗ ปฏิเสธ / Deny</a>'
      || '</p>'
      || '<p style="color:#6b7280;font-size:12px;margin-top:24px">การอนุมัติจากเจ้าหน้าที่ท่านใดท่านหนึ่งใน 3 ท่านถือว่าเสร็จสมบูรณ์<br>Any one of the 3 lab officers approving is sufficient.</p>'
      || '</div>'
    );
  END LOOP;

  -- Advisor email (if selected and has real email)
  IF NEW.advisor_email IS NOT NULL AND btrim(NEW.advisor_email) <> '' AND NEW.advisor_email <> 'advisor@example.com' THEN
    advisor_link := base_url || '/approve/advisor/' || NEW.advisor_token::text;
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (
      NEW.id, NEW.advisor_email,
      '[GeoCU Lab] ขอความเห็นชอบอาจารย์ที่ปรึกษา / Advisor endorsement — ' || room_rec.code,
      'advisor-endorsement',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#0b3d2e">ขอความเห็นชอบจากอาจารย์ที่ปรึกษา<br>Advisor Endorsement Request</h2>'
      || '<p>เรียน ' || COALESCE(NEW.advisor_name,'อาจารย์') || ',<br>Dear Advisor,</p>'
      || '<p>นิสิต/นักศึกษาของท่านได้ยื่นคำขอจองห้องปฏิบัติการ<br>Your student has requested a laboratory reservation.</p>'
      || details_html
      || '<p style="margin-top:20px">'
      || '<a href="' || advisor_link || '?decision=approved" style="background:#16a34a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:10px">✓ อนุมัติ / Approve</a>'
      || '<a href="' || advisor_link || '?decision=rejected" style="background:#dc2626;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">✗ ปฏิเสธ / Deny</a>'
      || '</p>'
      || '</div>'
    );
  END IF;

  RETURN NULL;
END $$;

-- =========================================================
-- 7. Rewrite check_reservation_approvals (admin lookup, bilingual)
-- =========================================================
CREATE OR REPLACE FUNCTION public.check_reservation_approvals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_url text := 'https://geoculab.lovable.app';
  room_rec RECORD;
  details_html text;
  admin_rec RECORD;
BEGIN
  SELECT code, name_en INTO room_rec FROM public.rooms WHERE id = NEW.room_id;
  details_html := public.render_reservation_details(NEW, room_rec.code, room_rec.name_en);

  IF NEW.status='rejected'::reservation_status AND OLD.status <> 'rejected'::reservation_status THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] คำขอถูกปฏิเสธ / Request rejected #' || substr(NEW.id::text,1,8),
      'requester-rejection',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#b91c1c">คำขอจองห้องถูกปฏิเสธ / Reservation Rejected</h2>'
      || '<p>เรียน ' || COALESCE(NEW.requester_name,'') || ',<br>Dear ' || COALESCE(NEW.requester_name,'') || ',</p>'
      || '<p>คำขอจองห้องของคุณไม่ได้รับการอนุมัติ<br>Unfortunately your reservation request was not approved.</p>'
      || details_html
      || CASE WHEN COALESCE(NEW.admin_note, NEW.ta_note) IS NOT NULL
         THEN '<p><b>เหตุผล / Reason:</b> ' || COALESCE(NEW.admin_note, NEW.ta_note) || '</p>' ELSE '' END
      || '<p><a href="' || base_url || '/reserve" style="background:#0b3d2e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">จองใหม่ / Submit new request</a></p>'
      || '</div>');
  END IF;

  IF NEW.status='ta_approved'::reservation_status AND OLD.status <> 'ta_approved'::reservation_status THEN
    FOR admin_rec IN SELECT email, name FROM public.notification_settings WHERE role='admin' AND active = true LOOP
      INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
      VALUES (NEW.id, admin_rec.email,
        '[GeoCU Lab] รอการอนุมัติขั้นสุดท้าย / Awaiting final approval #' || substr(NEW.id::text,1,8),
        'admin-approval-request',
        '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
        || '<h2 style="color:#0b3d2e">รอการอนุมัติขั้นสุดท้าย / Awaiting Final Approval</h2>'
        || '<p>เจ้าหน้าที่ห้องปฏิบัติการได้อนุมัติแล้ว โปรดยืนยันขั้นสุดท้าย<br>Lab officer has approved. Please give final confirmation.</p>'
        || details_html
        || '<p><a href="' || base_url || '/admin" style="background:#0b3d2e;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold">เปิดหน้าผู้ดูแล / Open Admin Dashboard</a></p>'
        || '</div>');
    END LOOP;
  END IF;

  IF NEW.status IN ('confirmed'::reservation_status,'approved'::reservation_status) AND OLD.status NOT IN ('confirmed'::reservation_status,'approved'::reservation_status) THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] ยืนยันการจอง / Reservation confirmed #' || substr(NEW.id::text,1,8),
      'requester-confirmation',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2 style="color:#16a34a">✓ ยืนยันการจองห้องปฏิบัติการ / Reservation Confirmed</h2>'
      || '<p>เรียน ' || COALESCE(NEW.requester_name,'') || ',<br>Dear ' || COALESCE(NEW.requester_name,'') || ',</p>'
      || '<p>คำขอจองห้องของคุณได้รับการอนุมัติเรียบร้อยแล้ว<br>Your reservation has been fully approved.</p>'
      || details_html
      || '<p style="background:#f0fdf4;border:1px solid #16a34a;padding:12px;border-radius:6px"><b>Request ID:</b> ' || NEW.id::text || '<br><b>แสดงอีเมลนี้ที่ห้องปฏิบัติการ / Show this email at the lab</b></p>'
      || '</div>');
  END IF;

  IF NEW.status='expired'::reservation_status AND OLD.status IN ('pending'::reservation_status,'pending_ta_advisor'::reservation_status) THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (NEW.id, NEW.requester_email,
      '[GeoCU Lab] คำขอหมดอายุ / Request expired',
      'requester-expired',
      '<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">'
      || '<h2>คำขอหมดอายุ / Request Expired</h2>'
      || '<p>คำขอจองของคุณไม่ได้รับการพิจารณาภายใน 48 ชั่วโมง โปรดยื่นคำขอใหม่<br>Your request was not reviewed within 48 hours. Please submit a new request.</p>'
      || '<p><a href="' || base_url || '/reserve" style="background:#0b3d2e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">จองใหม่ / Rebook</a></p>'
      || '</div>');
  END IF;

  RETURN NEW;
END $$;

-- =========================================================
-- 8. Simplify notify_requester_on_admin_decision (superseded above)
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_requester_on_admin_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN NEW; -- handled by check_reservation_approvals
END $$;

-- =========================================================
-- 9. Ensure triggers exist
-- =========================================================
DROP TRIGGER IF EXISTS trg_reservation_defaults ON public.reservations;
CREATE TRIGGER trg_reservation_defaults BEFORE INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_reservation_defaults();

DROP TRIGGER IF EXISTS trg_enqueue_reservation_emails ON public.reservations;
CREATE TRIGGER trg_enqueue_reservation_emails AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.enqueue_reservation_emails();

DROP TRIGGER IF EXISTS trg_check_reservation_approvals ON public.reservations;
CREATE TRIGGER trg_check_reservation_approvals AFTER UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.check_reservation_approvals();
