CREATE TABLE public.visitor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  client_sent_at timestamptz,
  ip_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  page_path text NOT NULL DEFAULT '/',
  referrer text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  device_type text NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('mobile','desktop','tablet')),
  session_id text NOT NULL DEFAULT ''
);
CREATE INDEX visitor_logs_created_at_idx ON public.visitor_logs (created_at DESC);
GRANT SELECT ON public.visitor_logs TO authenticated;
GRANT ALL ON public.visitor_logs TO service_role;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads visitor logs" ON public.visitor_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'));

CREATE OR REPLACE FUNCTION public.purge_old_visitor_logs() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ DELETE FROM public.visitor_logs WHERE created_at < now() - interval '90 days'; $$;
REVOKE EXECUTE ON FUNCTION public.purge_old_visitor_logs() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('purge-visitor-logs', '17 9 * * *', 'SELECT public.purge_old_visitor_logs()');