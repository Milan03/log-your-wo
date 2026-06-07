begin;

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "Users manage their profile" on public.profiles;
create policy "Users manage their profile"
    on public.profiles
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

commit;
