create table if not exists agent_profiles (
  agent_id text primary key,
  name text not null,
  selected_cultivator_id text not null,
  gender_presentation text,
  pronouns text,
  origin text,
  temperament text,
  starting_path text,
  llm_provider text,
  llm_model_name text,
  llm_model_version text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_seen_at timestamptz
);

create table if not exists agent_credentials (
  api_key_hash text primary key,
  agent_id text not null references agent_profiles(agent_id) on delete cascade,
  created_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index if not exists agent_credentials_agent_id_idx on agent_credentials(agent_id);
