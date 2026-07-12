GRANT SELECT ON public.advisors TO anon, authenticated;
GRANT ALL ON public.advisors TO service_role;

GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;

DROP POLICY IF EXISTS "Anyone can view active advisors" ON public.advisors;
DROP POLICY IF EXISTS "Admins manage advisors" ON public.advisors;

CREATE POLICY "Anyone can view active advisors"
ON public.advisors
FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins manage advisors"
ON public.advisors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

UPDATE public.advisors
SET active = true
WHERE active IS DISTINCT FROM true;