-- Split enqueue_reservation_emails into two: BEFORE sets defaults on NEW,
-- AFTER inserts pending_emails rows (FK to reservations now satisfied).

CREATE OR REPLACE FUNCTION public.set_reservation_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ta_email IS NULL THEN NEW.ta_email := 'ta@example.com'; END IF;
  IF NEW.advisor_email IS NULL THEN NEW.advisor_email := 'advisor@example.com'; END IF;
  NEW.status := 'pending_ta_advisor';
  RETURN NEW;
END;
$$;

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
  ta_link := base_url || '/approve/ta/' || NEW.ta_token::text;
  advisor_link := base_url || '/approve/advisor/' || NEW.advisor_token::text;

  INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
  VALUES (
    NEW.id, NEW.ta_email,
    '[Geo Labs] Reservation approval request / คำขออนุมัติการจองห้อง',
    'ta-approval-request',
    '<p>A new room reservation needs your approval.</p><p><a href="' || ta_link || '">Review &amp; approve</a></p>' ||
    '<p>มีคำขอจองห้องใหม่รอการอนุมัติของคุณ</p><p><a href="' || ta_link || '">ตรวจสอบและอนุมัติ</a></p>'
  );

  INSERT INTO public.pending_emails (reservation_id, to_email, subject, template, body_html)
  VALUES (
    NEW.id, NEW.advisor_email,
    '[Geo Labs] Reservation approval request / คำขออนุมัติการจองห้อง',
    'advisor-approval-request',
    '<p>A new room reservation needs your approval.</p><p><a href="' || advisor_link || '">Review &amp; approve</a></p>' ||
    '<p>มีคำขอจองห้องใหม่รอการอนุมัติของคุณ</p><p><a href="' || advisor_link || '">ตรวจสอบและอนุมัติ</a></p>'
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_reservation_emails ON public.reservations;

CREATE TRIGGER trg_set_reservation_defaults
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_reservation_defaults();

CREATE TRIGGER trg_enqueue_reservation_emails
AFTER INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.enqueue_reservation_emails();