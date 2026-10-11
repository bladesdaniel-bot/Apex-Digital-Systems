CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  website text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.submit_lead(_name text, _email text, _website text, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF length(trim(coalesce(_name,''))) = 0 OR length(_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF coalesce(_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 255 THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF length(coalesce(_website,'')) > 500 OR length(coalesce(_note,'')) > 4000 THEN RAISE EXCEPTION 'Input too long'; END IF;
  INSERT INTO public.leads (name, email, website, note)
  VALUES (trim(_name), lower(trim(_email)), trim(coalesce(_website,'')), trim(coalesce(_note,'')))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_lead(text, text, text, text) TO anon, authenticated;