CREATE OR REPLACE FUNCTION public.visitor_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; today_start timestamptz := (date_trunc('day', now() AT TIME ZONE 'America/Los_Angeles')) AT TIME ZONE 'America/Los_Angeles';
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'telemarketer')) THEN RAISE EXCEPTION 'Team members only'; END IF;
  WITH v AS (
    SELECT * FROM visitor_logs
    WHERE created_at > now() - interval '30 days'
      AND page_path NOT LIKE '/team%' AND page_path NOT LIKE '/admin%' AND page_path NOT LIKE '/auth%' AND page_path NOT LIKE '/client%'
  )
  SELECT jsonb_build_object(
    'today', (SELECT count(DISTINCT session_id) FROM v WHERE created_at >= today_start),
    'd7', (SELECT count(DISTINCT session_id) FROM v WHERE created_at > now() - interval '7 days'),
    'd30', (SELECT count(DISTINCT session_id) FROM v),
    'unique', (SELECT count(DISTINCT ip_address) FROM v WHERE ip_address <> ''),
    'views30', (SELECT count(*) FROM v),
    'pages', COALESCE((SELECT jsonb_agg(jsonb_build_array(page_path, n)) FROM (SELECT page_path, count(*) n FROM v GROUP BY 1 ORDER BY 2 DESC LIMIT 8) t), '[]'::jsonb),
    'refs', COALESCE((SELECT jsonb_agg(jsonb_build_array(referrer, n)) FROM (SELECT referrer, count(*) n FROM v WHERE referrer <> '' AND referrer NOT LIKE '%(internal)%' GROUP BY 1 ORDER BY 2 DESC LIMIT 8) t), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.visitor_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.visitor_stats() TO authenticated;