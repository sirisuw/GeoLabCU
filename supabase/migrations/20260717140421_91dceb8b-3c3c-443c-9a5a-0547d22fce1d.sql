
CREATE POLICY "Admins can update pending emails"
  ON public.pending_emails
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT UPDATE ON public.pending_emails TO authenticated;
