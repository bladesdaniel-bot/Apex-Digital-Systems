-- Replace owner@example.com with the owner's email before running on a fresh database.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.handle_new_team_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g text := lower(COALESCE(NEW.raw_user_meta_data->>'gender', ''));
BEGIN
  IF g NOT IN ('male', 'female') THEN g := ''; END IF;
  INSERT INTO public.profiles (id, email, username, gender, location)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'username', ''), g, left(trim(COALESCE(NEW.raw_user_meta_data->>'location', '')), 120));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'owner@example.com' THEN 'admin'::public.app_role ELSE 'pending'::public.app_role END);
  RETURN NEW;
END;
$$;