DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations"
  ON public.reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(requester_name) BETWEEN 2 AND 120
    AND requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(purpose) BETWEEN 3 AND 1000
    AND attendees BETWEEN 1 AND 500
    AND end_at > start_at
    AND status IN ('pending'::reservation_status, 'pending_advisor'::reservation_status, 'pending_staff'::reservation_status, 'pending_ta_advisor'::reservation_status)
  );