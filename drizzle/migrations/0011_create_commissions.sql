CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  customer_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sale_amount numeric(12,2) NOT NULL CHECK (sale_amount > 0),
  commission_amount numeric(12,2) NOT NULL CHECK (commission_amount >= 0),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'owed' CHECK (status IN ('owed','paid')),
  paid_at timestamptz,
  paid_note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commissions_employee ON public.commissions(employee_id, sale_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage commissions" ON public.commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Employees read own commissions" ON public.commissions FOR SELECT TO authenticated
  USING (employee_id = auth.uid());