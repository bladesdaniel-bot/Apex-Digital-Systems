CREATE TABLE public.quote_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  installment integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  invoice_number text NOT NULL DEFAULT '',
  receipt_url text NOT NULL DEFAULT '',
  pdf_url text NOT NULL DEFAULT '',
  stripe_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_ref)
);
GRANT ALL ON public.quote_receipts TO service_role;
ALTER TABLE public.quote_receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX quote_receipts_quote_idx ON public.quote_receipts(quote_id);