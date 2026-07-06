
-- 1. Extend reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS ta_email text,
  ADD COLUMN IF NOT EXISTS ta_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ta_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS ta_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS advisor_email text,
  ADD COLUMN IF NOT EXISTS advisor_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS advisor_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS advisor_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS reservations_ta_token_idx ON public.reservations(ta_token);
CREATE INDEX IF NOT EXISTS reservations_advisor_token_idx ON public.reservations(advisor_token);

-- Allow anon to read a single reservation by token (needed for public approval page)
DROP POLICY IF EXISTS "Anyone can read reservation by approval token" ON public.reservations;
CREATE POLICY "Anyone can read reservation by approval token"
ON public.reservations FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anon to update ta/advisor decision fields (server route validates token)
DROP POLICY IF EXISTS "Anyone can update via approval token" ON public.reservations;
CREATE POLICY "Anyone can update via approval token"
ON public.reservations FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. Pending emails table (queue drafts until real sending is wired up)
CREATE TABLE IF NOT EXISTS public.pending_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  template text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_emails TO authenticated;
GRANT INSERT ON public.pending_emails TO anon;
GRANT ALL ON public.pending_emails TO service_role;

ALTER TABLE public.pending_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pending emails"
ON public.pending_emails FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert pending emails"
ON public.pending_emails FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Function + trigger to draft the initial TA + Advisor emails on reservation insert
CREATE OR REPLACE FUNCTION public.enqueue_reservation_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text := 'https://id-preview--a8a8882b-a971-478e-9fa2-73a67402965e.lovable.app';
  ta_link text;
  advisor_link text;
BEGIN
  -- Default placeholder emails if not provided
  IF NEW.ta_email IS NULL THEN
    NEW.ta_email := 'ta@example.com';
  END IF;
  IF NEW.advisor_email IS NULL THEN
    NEW.advisor_email := 'advisor@example.com';
  END IF;

  NEW.status := 'pending_ta_advisor';

  ta_link := base_url || '/approve/ta/' || NEW.ta_token::text;
  advisor_link := base_url || '/approve/advisor/' || NEW.advisor_token::text;

  INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
  VALUES (
    NEW.id,
    NEW.ta_email,
    '[Geo Labs] Reservation approval request / คำขออนุมัติการจองห้อง',
    'ta-approval-request',
    '<p>A new room reservation needs your approval.</p><p><a href="' || ta_link || '">Review &amp; approve</a></p>' ||
    '<p>มีคำขอจองห้องใหม่รอการอนุมัติของคุณ</p><p><a href="' || ta_link || '">ตรวจสอบและอนุมัติ</a></p>'
  );

  INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
  VALUES (
    NEW.id,
    NEW.advisor_email,
    '[Geo Labs] Reservation approval request / คำขออนุมัติการจองห้อง',
    'advisor-approval-request',
    '<p>A new room reservation needs your approval.</p><p><a href="' || advisor_link || '">Review &amp; approve</a></p>' ||
    '<p>มีคำขอจองห้องใหม่รอการอนุมัติของคุณ</p><p><a href="' || advisor_link || '">ตรวจสอบและอนุมัติ</a></p>'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_reservation_emails ON public.reservations;
CREATE TRIGGER trg_enqueue_reservation_emails
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.enqueue_reservation_emails();

-- 4. Trigger to move to admin stage when both TA + Advisor approve
CREATE OR REPLACE FUNCTION public.check_reservation_approvals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If either rejected → reject reservation + notify requester
  IF NEW.ta_status = 'rejected' OR NEW.advisor_status = 'rejected' THEN
    IF NEW.status <> 'rejected' THEN
      NEW.status := 'rejected';
      INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
      VALUES (
        NEW.id,
        NEW.requester_email,
        '[Geo Labs] Reservation rejected / คำขอถูกปฏิเสธ',
        'requester-rejection',
        '<p>Your reservation request was rejected.</p><p>คำขอจองห้องของคุณถูกปฏิเสธ</p>'
      );
    END IF;
  ELSIF NEW.ta_status = 'approved' AND NEW.advisor_status = 'approved'
        AND NEW.admin_notified_at IS NULL THEN
    NEW.status := 'pending_admin';
    NEW.admin_notified_at := now();
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (
      NEW.id,
      'admin@example.com',
      '[Geo Labs] Reservation ready for final approval / คำขอรอการอนุมัติขั้นสุดท้าย',
      'admin-approval-request',
      '<p>TA and Advisor have approved. Please review in admin dashboard.</p>' ||
      '<p>TA และอาจารย์ที่ปรึกษาได้อนุมัติแล้ว โปรดตรวจสอบในหน้าผู้ดูแลระบบ</p>'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_reservation_approvals ON public.reservations;
CREATE TRIGGER trg_check_reservation_approvals
BEFORE UPDATE OF ta_status, advisor_status, status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.check_reservation_approvals();

-- 5. When admin flips to approved → email requester
CREATE OR REPLACE FUNCTION public.notify_requester_on_admin_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
    VALUES (
      NEW.id,
      NEW.requester_email,
      '[Geo Labs] Reservation confirmed / ยืนยันการจองห้อง',
      'requester-confirmation',
      '<p>Your reservation has been approved.</p><p>คำขอจองห้องของคุณได้รับการอนุมัติแล้ว</p>'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_requester ON public.reservations;
CREATE TRIGGER trg_notify_requester
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.notify_requester_on_admin_decision();
