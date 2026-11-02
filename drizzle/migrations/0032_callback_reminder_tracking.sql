ALTER TABLE public.call_list ADD COLUMN callback_notified_at timestamptz, ADD COLUMN callback_escalated_at timestamptz;
COMMENT ON COLUMN public.call_list.callback_notified_at IS 'When the assigned caller was emailed that the call-back is due.';
COMMENT ON COLUMN public.call_list.callback_escalated_at IS 'When the owner was alerted that the call-back went unhandled for over an hour.';