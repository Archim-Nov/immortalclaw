-- Remove self-reported LLM metadata columns from agent_profiles.
-- These fields allowed agents to inject arbitrary display strings into the
-- public agent directory, which is a content-injection risk.
ALTER TABLE agent_profiles
  DROP COLUMN IF EXISTS llm_provider,
  DROP COLUMN IF EXISTS llm_model_name,
  DROP COLUMN IF EXISTS llm_model_version;
