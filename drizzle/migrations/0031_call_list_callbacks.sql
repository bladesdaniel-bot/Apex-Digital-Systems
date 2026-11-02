ALTER TABLE public.call_list ADD COLUMN callback_at timestamptz, ADD COLUMN callback_by uuid, ADD COLUMN callback_name text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.call_list.callback_at IS 'Scheduled call-back time; row stays out of the queue until this time passes.';
CREATE INDEX call_list_callback_at_idx ON public.call_list (callback_at) WHERE callback_at IS NOT NULL;