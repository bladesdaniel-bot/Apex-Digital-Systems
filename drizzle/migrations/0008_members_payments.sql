CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  plan_name text NOT NULL DEFAULT '',
  plan_price numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual','one-time')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled')),
  join_date date NOT NULL DEFAULT current_date,
  next_billing_date date,
  stripe_customer_id text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  payment_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','failed','refunded')),
  stripe_payment_id text,
  stripe_invoice_id text,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_member_idx ON public.payments(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members, public.payments TO authenticated;
GRANT ALL ON public.members, public.payments TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage members" ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS
$$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER members_touch BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();