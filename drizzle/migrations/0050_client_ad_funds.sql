CREATE TABLE public.client_ad_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending',
  stripe_env text NOT NULL DEFAULT '',
  stripe_session_id text NOT NULL DEFAULT '',
  stripe_payment_ref text NOT NULL DEFAULT '',
  added_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT ALL ON public.client_ad_funds TO service_role;
ALTER TABLE public.client_ad_funds ENABLE ROW LEVEL SECURITY;
CREATE INDEX client_ad_funds_quote_idx ON public.client_ad_funds(quote_id);