CREATE TABLE public.cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id),
  business_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'both' CHECK (scope IN ('membership','build','both')),
  reason text NOT NULL DEFAULT 'other',
  notes text NOT NULL DEFAULT '',
  refund_type text NOT NULL DEFAULT 'none' CHECK (refund_type IN ('none','partial','full')),
  refund_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','retained')),
  submitted_by uuid,
  submitted_by_name text NOT NULL DEFAULT '',
  submitted_by_employee_id text NOT NULL DEFAULT '',
  review_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cancellations TO authenticated;
GRANT ALL ON public.cancellations TO service_role;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team files cancellations" ON public.cancellations FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer')) AND submitted_by = auth.uid());
CREATE POLICY "Team reads cancellations" ON public.cancellations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR submitted_by = auth.uid());
CREATE POLICY "Admins review cancellations" ON public.cancellations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));