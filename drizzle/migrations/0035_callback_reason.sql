ALTER TABLE public.call_log ADD COLUMN callback_reason text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.call_log.callback_reason IS 'Reason the teammate scheduled the call-back, kept permanently with the call record';