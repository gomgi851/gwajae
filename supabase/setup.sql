create extension if not exists pgcrypto;

create table if not exists public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (email = lower(email))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists allowed_users_set_updated_at on public.allowed_users;
create trigger allowed_users_set_updated_at
before update on public.allowed_users
for each row
execute function public.set_updated_at();

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = public.current_auth_email()
      and role = 'admin'
      and active = true
  )
$$;

alter table public.allowed_users enable row level security;

drop policy if exists "allowed_users_select_self_or_admin" on public.allowed_users;
create policy "allowed_users_select_self_or_admin"
on public.allowed_users
for select
to authenticated
using (
  public.is_admin_user()
  or email = public.current_auth_email()
);

drop policy if exists "allowed_users_insert_admin" on public.allowed_users;
create policy "allowed_users_insert_admin"
on public.allowed_users
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "allowed_users_update_admin" on public.allowed_users;
create policy "allowed_users_update_admin"
on public.allowed_users
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

insert into public.allowed_users (email, role, active)
values ('yoonggee@dgu.ac.kr', 'admin', true)
on conflict (email) do update
set role = excluded.role,
    active = excluded.active;
