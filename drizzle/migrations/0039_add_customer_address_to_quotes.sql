ALTER TABLE public.quotes ADD COLUMN customer_address text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.quotes.customer_address IS 'Business physical address captured on the order.';