ALTER TABLE public.call_list ADD COLUMN status text NOT NULL DEFAULT 'queued';
ALTER TABLE public.call_list ADD CONSTRAINT call_list_status_check CHECK (status IN ('queued','subscriber','dismissed'));
COMMENT ON COLUMN public.call_list.status IS 'queued = still to call, subscriber = became a paying customer, dismissed = removed from the call list';