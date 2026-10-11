CREATE TABLE public.contractor_tax_info (
  user_id uuid PRIMARY KEY,
  legal_name text NOT NULL,
  business_name text NOT NULL DEFAULT '',
  tax_classification text NOT NULL,
  tin_type text NOT NULL,
  tin text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  phone text NOT NULL DEFAULT '',
  certified_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contractor_tax_info TO authenticated;
GRANT ALL ON public.contractor_tax_info TO service_role;
ALTER TABLE public.contractor_tax_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tax info read" ON public.contractor_tax_info FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own tax info insert" ON public.contractor_tax_info FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tax info update" ON public.contractor_tax_info FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER contractor_tax_info_touch BEFORE UPDATE ON public.contractor_tax_info FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();