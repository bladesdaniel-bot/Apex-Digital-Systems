ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS order_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS installment_number integer;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS refunded_service_amount numeric(12,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS commissions_order_installment_uniq ON public.commissions(order_quote_id, installment_number) WHERE order_quote_id IS NOT NULL AND installment_number IS NOT NULL AND kind = 'sale';
COMMENT ON COLUMN public.commissions.quote_id IS 'Legacy whole-order or owner-entered commission. New collected installment commissions use order_quote_id and installment_number to preserve old records and allow payment-by-payment credit.';