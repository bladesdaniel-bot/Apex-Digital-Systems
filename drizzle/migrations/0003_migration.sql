DROP POLICY IF EXISTS "Anyone can read submission count" ON public.form_submissions;
REVOKE SELECT ON public.form_submissions FROM anon;
CREATE POLICY "Admins read submission count" ON public.form_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));