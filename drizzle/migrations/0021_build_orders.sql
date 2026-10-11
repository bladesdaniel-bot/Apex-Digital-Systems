ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS build_status text NOT NULL DEFAULT '';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS build_ready_at timestamptz;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS build_notes text NOT NULL DEFAULT '';
UPDATE public.quotes SET build_status = 'new', build_ready_at = updated_at WHERE installments_paid >= 1 AND build_status = '';

CREATE TABLE public.order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'team',
  uploaded_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_photos TO authenticated;
GRANT ALL ON public.order_photos TO service_role;
ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads order photos" ON public.order_photos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'telemarketer'::public.app_role));