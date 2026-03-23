DROP TABLE IF EXISTS public.world_locks;
DROP TABLE IF EXISTS public.world_actions;
DROP TABLE IF EXISTS public.world_events;
DROP TABLE IF EXISTS public.tick_runs;
DROP TABLE IF EXISTS public.cultivator_records;
DROP TABLE IF EXISTS public.world_snapshots;

TRUNCATE TABLE public.agent_credentials;
TRUNCATE TABLE public.agent_profiles CASCADE;
