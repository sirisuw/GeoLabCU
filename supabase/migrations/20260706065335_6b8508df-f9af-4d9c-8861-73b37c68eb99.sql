
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users can see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can see all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rooms
CREATE TYPE public.room_type AS ENUM ('lab', 'pc');

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_th TEXT NOT NULL,
  type room_type NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  description_en TEXT,
  description_th TEXT,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rooms" ON public.rooms
  FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage rooms" ON public.rooms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reservations
CREATE TYPE public.reservation_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  department TEXT,
  student_id TEXT,
  advisor_name TEXT,
  purpose TEXT NOT NULL,
  attendees INT NOT NULL DEFAULT 1,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.reservations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can create reservations" ON public.reservations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Only admins can view/manage
CREATE POLICY "Admins can view all reservations" ON public.reservations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reservations" ON public.reservations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reservations" ON public.reservations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Public list of approved reservations (for calendar/availability), non-PII columns via a view
CREATE VIEW public.public_reservations AS
  SELECT id, room_id, start_at, end_at, status FROM public.reservations
  WHERE status IN ('approved', 'pending');
GRANT SELECT ON public.public_reservations TO anon, authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-grant admin role to the first user who signs up (bootstrap)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed rooms based on Chula geology labs
INSERT INTO public.rooms (code, name_en, name_th, type, capacity, description_en, description_th, location) VALUES
('LAB-101', 'Mineralogy & Petrology Lab', 'ห้องปฏิบัติการแร่และหินวิทยา', 'lab', 30, 'Microscopes, thin-section equipment, mineral collections.', 'กล้องจุลทรรศน์ อุปกรณ์แผ่นบาง คอลเลกชันแร่', 'Building 1, Floor 2'),
('LAB-102', 'Sedimentology Lab', 'ห้องปฏิบัติการตะกอนวิทยา', 'lab', 24, 'Sieves, grain analysis and sediment prep tools.', 'ตะแกรงร่อน อุปกรณ์วิเคราะห์เม็ดตะกอน', 'Building 1, Floor 2'),
('LAB-201', 'Geochemistry Lab', 'ห้องปฏิบัติการธรณีเคมี', 'lab', 20, 'Fume hoods, spectrometry equipment.', 'ตู้ดูดควัน อุปกรณ์วิเคราะห์สเปกตรัม', 'Building 2, Floor 1'),
('LAB-202', 'Paleontology Lab', 'ห้องปฏิบัติการบรรพชีวินวิทยา', 'lab', 18, 'Fossil preparation area and reference collection.', 'พื้นที่เตรียมฟอสซิลและคอลเลกชันอ้างอิง', 'Building 2, Floor 2'),
('PC-A', 'GIS Computer Room A', 'ห้องคอมพิวเตอร์ GIS A', 'pc', 30, 'ArcGIS, QGIS, dual monitors, plotter access.', 'ArcGIS, QGIS จอคู่ เชื่อมต่อพล็อตเตอร์', 'Building 1, Floor 3'),
('PC-B', 'Modeling Computer Room B', 'ห้องคอมพิวเตอร์แบบจำลอง B', 'pc', 25, 'Petrel, MATLAB, Python numerical stack.', 'Petrel, MATLAB, Python สำหรับงานคำนวณ', 'Building 2, Floor 3'),
('PC-C', 'Seminar PC Room', 'ห้องคอมพิวเตอร์สัมมนา', 'pc', 20, 'Presentation setup with projector and 20 workstations.', 'พร้อมโปรเจกเตอร์และเวิร์กสเตชัน 20 เครื่อง', 'Building 1, Floor 3');
