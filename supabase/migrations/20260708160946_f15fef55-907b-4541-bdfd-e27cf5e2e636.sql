
-- 1) room_staff table
CREATE TABLE public.room_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'officer',
  notify boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_staff TO authenticated;
GRANT ALL ON public.room_staff TO service_role;

ALTER TABLE public.room_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage room_staff"
  ON public.room_staff FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view room_staff"
  ON public.room_staff FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_room_staff_updated_at
  BEFORE UPDATE ON public.room_staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_room_staff_room_id ON public.room_staff(room_id);
