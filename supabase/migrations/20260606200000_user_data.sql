begin;

create table if not exists public.workout_logs (
    user_id uuid not null references auth.users(id) on delete cascade,
    id text not null,
    workout_date date not null,
    data jsonb not null check (jsonb_typeof(data) = 'object'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, id)
);

create index if not exists workout_logs_user_date_idx
    on public.workout_logs (user_id, workout_date desc);

create table if not exists public.imported_programs (
    user_id uuid not null references auth.users(id) on delete cascade,
    id text not null,
    name text not null,
    imported_at timestamptz not null default now(),
    data jsonb not null check (jsonb_typeof(data) = 'object'),
    primary key (user_id, id)
);

create index if not exists imported_programs_user_imported_idx
    on public.imported_programs (user_id, imported_at desc);

create table if not exists public.imported_workout_states (
    user_id uuid not null,
    program_id text not null,
    week_id text not null,
    day_id text not null,
    data jsonb not null check (jsonb_typeof(data) = 'object'),
    updated_at timestamptz not null default now(),
    primary key (user_id, program_id, week_id, day_id),
    foreign key (user_id, program_id)
        references public.imported_programs(user_id, id)
        on delete cascade
);

create table if not exists public.user_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    active_program_id text,
    completion_color text check (
        completion_color is null
        or completion_color ~ '^#[0-9a-fA-F]{6}$'
    ),
    updated_at timestamptz not null default now()
);

alter table public.workout_logs enable row level security;
alter table public.imported_programs enable row level security;
alter table public.imported_workout_states enable row level security;
alter table public.user_preferences enable row level security;

alter table public.workout_logs force row level security;
alter table public.imported_programs force row level security;
alter table public.imported_workout_states force row level security;
alter table public.user_preferences force row level security;

revoke all on public.workout_logs from anon;
revoke all on public.imported_programs from anon;
revoke all on public.imported_workout_states from anon;
revoke all on public.user_preferences from anon;

grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.imported_programs to authenticated;
grant select, insert, update, delete on public.imported_workout_states to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

drop policy if exists "Users manage their workout logs" on public.workout_logs;
create policy "Users manage their workout logs"
    on public.workout_logs
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their imported programs" on public.imported_programs;
create policy "Users manage their imported programs"
    on public.imported_programs
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their imported workout states" on public.imported_workout_states;
create policy "Users manage their imported workout states"
    on public.imported_workout_states
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their preferences" on public.user_preferences;
create policy "Users manage their preferences"
    on public.user_preferences
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

commit;
