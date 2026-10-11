ALTER TABLE public.call_list
  ADD COLUMN website_status text NOT NULL DEFAULT 'unchecked',
  ADD COLUMN website_checked_at timestamptz,
  ADD COLUMN website_check_note text NOT NULL DEFAULT '';
ALTER TABLE public.call_list ADD CONSTRAINT call_list_website_status_valid CHECK (website_status IN ('unchecked', 'no_website', 'reachable', 'unavailable', 'uncertain'));
UPDATE public.call_list SET website_status = 'no_website', website_check_note = 'No website listed on Google.' WHERE btrim(website) = '';
COMMENT ON COLUMN public.call_list.website_status IS 'Automated reachability check; unavailable or uncertain does not mean no website exists.';