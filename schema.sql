-- Shack Out Back starter schema for Supabase/Postgres.
-- Review and test this schema before applying it to a real project.
-- Do not expose a service-role key in the browser.
-- Initial concept: one inventory shared by authorized household members.

create extension if not exists pgcrypto;

create table if not exists public.inventories (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Household Inventory',
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_members (
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (inventory_id, user_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  name text not null,
  prefix text not null,
  next_number bigint not null default 1 check (next_number > 0),
  created_at timestamptz not null default now(),
  unique (inventory_id, prefix),
  unique (inventory_id, name)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (inventory_id, name)
);

create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  room_id uuid not null references public.rooms(id),
  location_id uuid not null references public.locations(id),
  box_number bigint not null,
  box_code text not null,
  description text not null,
  notes text not null default '',
  status text not null default 'Packed',
  qr_token uuid not null default gen_random_uuid(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inventory_id, box_code),
  unique (room_id, box_number)
);

create table if not exists public.box_items (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.retired_box_codes (
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  box_code text not null,
  retired_at timestamptz not null default now(),
  primary key (inventory_id, box_code)
);

-- Row-level security is enabled, but policies are intentionally not added here:
-- a production deployment must define and test policies for inventory members.
-- Never deploy with RLS enabled and then assume the whole app is configured.
alter table public.inventories enable row level security;
alter table public.inventory_members enable row level security;
alter table public.rooms enable row level security;
alter table public.locations enable row level security;
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.retired_box_codes enable row level security;

-- TODO before use:
-- 1. Add policies so only inventory_members can read/write their inventory.
-- 2. Add a SECURITY DEFINER function that atomically allocates a room number
--    and inserts the box record in a transaction.
-- 3. Enforce that room_id and location_id belong to the same inventory_id.
-- 4. Add updated_at maintenance and safe delete/retirement behavior.
-- 5. Test with two real accounts and ensure one household cannot read another.
