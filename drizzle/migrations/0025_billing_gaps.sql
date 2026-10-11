ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS stripe_env text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_installment_at timestamptz,
  ADD COLUMN IF NOT EXISTS installment_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_charge_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS flag_note text NOT NULL DEFAULT '';

CREATE TABLE public.billing_links (
  token text PRIMARY KEY,
  stripe_customer_id text NOT NULL,
  stripe_env text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);
GRANT ALL ON public.billing_links TO service_role;
ALTER TABLE public.billing_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS quotes_next_installment_idx ON public.quotes (next_installment_at) WHERE next_installment_at IS NOT NULL;