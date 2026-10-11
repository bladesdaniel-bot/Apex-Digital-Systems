CREATE TABLE public.form_submissions (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.form_submissions (id, total) VALUES (1, 0);

GRANT SELECT ON public.form_submissions TO anon, authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read submission count"
  ON public.form_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.increment_form_submissions()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.form_submissions SET total = total + 1, updated_at = now() WHERE id = 1 RETURNING total;
$function$;