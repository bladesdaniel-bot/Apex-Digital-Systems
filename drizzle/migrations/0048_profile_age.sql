-- Replace owner@example.com with the owner's email before running on a fresh database.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
CREATE OR REPLACE FUNCTION public.handle_new_team_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g text := lower(COALESCE(NEW.raw_user_meta_data->>'gender', ''));
  a_txt text := COALESCE(NEW.raw_user_meta_data->>'age', '');
  a integer := NULL;
BEGIN
  IF g NOT IN ('male', 'female') THEN g := ''; END IF;
  IF a_txt ~ '^[0-9]{1,3}$' THEN a := a_txt::integer; IF a < 16 OR a > 100 THEN a := NULL; END IF; END IF;
  INSERT INTO public.profiles (id, email, username, gender, location, age)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'username', ''), g, left(trim(COALESCE(NEW.raw_user_meta_data->>'location', '')), 120), a);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'owner@example.com' THEN 'admin'::public.app_role ELSE 'pending'::public.app_role END);
  RETURN NEW;
END;
$$;