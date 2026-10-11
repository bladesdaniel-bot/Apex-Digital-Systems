ALTER TABLE public.commissions ADD COLUMN member_id uuid REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN kind text NOT NULL DEFAULT 'sale';
ALTER TABLE public.commissions ADD COLUMN stripe_invoice_id text;
CREATE UNIQUE INDEX commissions_invoice_employee_uniq ON public.commissions (stripe_invoice_id, employee_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX commissions_member_idx ON public.commissions (member_id);