ALTER TABLE public.leads ADD COLUMN phone text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.submit_lead(_name text, _email text, _website text, _note text, _phone text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF length(trim(coalesce(_name,''))) = 0 OR length(_name) > 120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF coalesce(_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 255 THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF length(trim(coalesce(_phone,''))) = 0 OR length(_phone) > 40 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF length(coalesce(_website,'')) > 500 OR length(coalesce(_note,'')) > 4000 THEN RAISE EXCEPTION 'Input too long'; END IF;
  INSERT INTO public.leads (name, email, website, note, phone)
  VALUES (trim(_name), lower(trim(_email)), trim(coalesce(_website,'')), trim(coalesce(_note,'')), trim(_phone))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $function$;