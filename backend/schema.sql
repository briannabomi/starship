-- Starship MVP backend schema for Neon Postgres.
-- Run after creating the Vercel/Neon database.

create extension if not exists pgcrypto;

create type app_role as enum ('coach', 'client', 'admin');
create type client_status as enum ('active', 'archived');
create type resource_status as enum ('imported', 'needs_review', 'published', 'archived', 'sync_error');
create type resource_visibility as enum ('coach_only', 'client_visible', 'shared_workspace_visible');
create type owner_type as enum ('client', 'relationship_workspace');
create type relationship_item_type as enum ('challenge', 'block', 'task', 'desire', 'fight', 'repair');
create type relationship_item_status as enum ('open', 'blocked', 'in_repair', 'complete', 'closed');

-- Auth.js tables. Keep names aligned with the selected Auth.js adapter.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique(provider, "providerAccountId")
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text not null unique,
  "userId" uuid not null references users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key(identifier, token)
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  role app_role not null,
  display_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text not null unique,
  phone text,
  status client_status not null default 'active',
  current_focus text,
  next_call_at timestamptz,
  drive_folder_id text,
  drive_folder_url text,
  resources_folder_id text,
  resources_folder_url text,
  archived_at timestamptz,
  archived_by_profile_id uuid references profiles(id),
  created_by_profile_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_users (
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'invited',
  invited_at timestamptz,
  accepted_at timestamptz,
  disabled_at timestamptz,
  primary key(client_id, user_id)
);

create table if not exists coach_clients (
  coach_profile_id uuid not null references profiles(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key(coach_profile_id, client_id)
);

create table if not exists relationship_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  focus text,
  created_by_profile_id uuid references profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists relationship_members (
  workspace_id uuid not null references relationship_workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  role text not null default 'partner',
  joined_at timestamptz not null default now(),
  primary key(workspace_id, client_id)
);

create table if not exists relationship_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references relationship_workspaces(id) on delete cascade,
  item_type relationship_item_type not null,
  title text not null,
  body text,
  status relationship_item_status not null default 'open',
  assigned_client_id uuid references clients(id),
  visibility text not null default 'shared',
  created_by_profile_id uuid references profiles(id),
  due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resource_folders (
  id uuid primary key default gen_random_uuid(),
  owner_type owner_type not null,
  owner_id uuid not null,
  purpose text not null,
  google_drive_folder_id text not null,
  google_drive_folder_url text,
  sync_enabled boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  owner_type owner_type not null,
  owner_id uuid not null,
  google_drive_file_id text not null unique,
  title text not null,
  mime_type text,
  file_url text,
  thumbnail_url text,
  category text,
  tags text[] not null default '{}',
  status resource_status not null default 'needs_review',
  visibility resource_visibility not null default 'coach_only',
  published_at timestamptz,
  reviewed_by_profile_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  google_drive_file_id text,
  title text not null,
  prompt text,
  body text,
  status text not null default 'draft',
  due_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists legacy_roadmaps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  google_drive_file_id text,
  file_url text,
  status text not null default 'linked',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists call_recordings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  external_url text,
  happened_at timestamptz,
  import_status text not null default 'linked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  relationship_workspace_id uuid references relationship_workspaces(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'open',
  visibility text not null default 'client_visible',
  source_type text not null default 'manual',
  source_id uuid,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles(id),
  event_type text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_clients_status on clients(status);
create index if not exists idx_resources_owner on resources(owner_type, owner_id);
create index if not exists idx_resources_status_visibility on resources(status, visibility);
create index if not exists idx_relationship_members_client on relationship_members(client_id);
create index if not exists idx_action_items_client_status on action_items(client_id, status);
