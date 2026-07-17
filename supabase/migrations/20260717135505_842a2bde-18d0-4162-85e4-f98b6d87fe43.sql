
DROP POLICY IF EXISTS "Advisors are viewable by everyone" ON public.advisors;
DROP POLICY IF EXISTS "Public can view active advisors" ON public.advisors;
DROP POLICY IF EXISTS "Anyone can view advisors" ON public.advisors;

REVOKE SELECT ON public.advisors FROM anon;
GRANT SELECT ON public.advisors TO authenticated;

CREATE POLICY "Authenticated can view advisors"
  ON public.advisors FOR SELECT
  TO authenticated
  USING (true);

DROP VIEW IF EXISTS public.advisors_public;
CREATE VIEW public.advisors_public
WITH (security_invoker = on) AS
  SELECT id, name_th, name_en, active, sort_order
  FROM public.advisors
  WHERE active = true;

GRANT SELECT ON public.advisors_public TO anon, authenticated;
