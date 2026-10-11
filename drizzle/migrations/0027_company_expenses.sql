CREATE TABLE public.company_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT current_date,
  vendor text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  allocation text NOT NULL DEFAULT 'general' CHECK (allocation IN ('general','project')),
  project text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  description text NOT NULL DEFAULT '',
  receipt_path text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_expenses TO authenticated;
GRANT ALL ON public.company_expenses TO service_role;
ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.company_expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX company_expenses_date_idx ON public.company_expenses (expense_date DESC);