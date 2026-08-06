create extension if not exists pgcrypto;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 600),
  color text not null default 'yellow' check (color in ('yellow', 'pink', 'blue', 'green')),
  x integer not null check (x >= 0 and x <= 1380),
  y integer not null check (y >= 0 and y <= 840),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_board_id_created_at_idx
  on public.notes (board_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

-- The browser never queries Supabase directly. Next.js route handlers use the
-- service-role key on the server, so anonymous/public table access stays closed.
alter table public.boards enable row level security;
alter table public.notes enable row level security;
