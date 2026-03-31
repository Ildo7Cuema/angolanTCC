create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  university text not null default '',
  course text not null default '',
  student_name text,
  advisor text,
  topic text not null default '',
  problem_statement text,
  methodology text,
  year text,
  status text not null default 'draft',
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();
