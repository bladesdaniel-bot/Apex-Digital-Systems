CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_list_id uuid REFERENCES public.call_list(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  package_name text NOT NULL DEFAULT '',
  package_price numeric NOT NULL DEFAULT 0,
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  membership_name text NOT NULL DEFAULT '',
  membership_price numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'none',
  discount_value numeric NOT NULL DEFAULT 0,
  promo_note text NOT NULL DEFAULT '',
  installments int NOT NULL DEFAULT 1,
  installments_paid int NOT NULL DEFAULT 0,
  one_time_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_discount_type CHECK (discount_type IN ('none','amount','percent')),
  CONSTRAINT quotes_installments CHECK (installments BETWEEN 1 AND 4),
  CONSTRAINT quotes_status CHECK (status IN ('open','partially_paid','paid','canceled'))
);
GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads quotes" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'));
CREATE POLICY "Team creates quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer')) AND created_by = auth.uid());
CREATE POLICY "Team updates quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'));
CREATE TRIGGER quotes_touch BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();