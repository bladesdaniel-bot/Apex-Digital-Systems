CREATE TABLE public.site_views (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_views TO anon, authenticated;
GRANT ALL ON public.site_views TO service_role;
ALTER TABLE public.site_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read view count" ON public.site_views FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.site_views (id, total) VALUES (1, 0);

CREATE OR REPLACE FUNCTION public.increment_site_views()
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.site_views SET total = total + 1, updated_at = now() WHERE id = 1 RETURNING total;
$$;
REVOKE ALL ON FUNCTION public.increment_site_views() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_site_views() TO anon, authenticated;