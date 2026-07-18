GRANT SELECT (id, name_th, name_en, active, sort_order) ON public.advisors TO anon;

DROP POLICY IF EXISTS "Anon can view active advisors" ON public.advisors;
CREATE POLICY "Anon can view active advisors"
  ON public.advisors FOR SELECT
  TO anon
  USING (active = true);