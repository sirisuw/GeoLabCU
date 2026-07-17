
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_emails TO service_role;

CREATE POLICY "Service role full access to pending_emails"
  ON public.pending_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
