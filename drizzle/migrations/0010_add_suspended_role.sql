ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suspended';

COMMENT ON TYPE public.app_role IS 'Team access states: pending = awaiting approval, telemarketer = approved, suspended = on hold (temporarily paused, e.g. leave), revoked = access removed, admin = owner.';