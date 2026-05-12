
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- stories
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  opening text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.stories enable row level security;
create policy "stories readable by all" on public.stories for select using (true);
create policy "auth users create stories" on public.stories for insert with check (auth.uid() = created_by);
create policy "owner update story" on public.stories for update using (auth.uid() = created_by);
create policy "owner delete story" on public.stories for delete using (auth.uid() = created_by);

-- story_segments
create table public.story_segments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  position int not null,
  created_at timestamptz not null default now()
);
alter table public.story_segments enable row level security;
create index on public.story_segments (story_id, position);

create policy "segments readable by all" on public.story_segments for select using (true);
create policy "auth users add segments" on public.story_segments for insert with check (auth.uid() = author_id);
create policy "owner update segment" on public.story_segments for update using (auth.uid() = author_id);
create policy "owner delete segment" on public.story_segments for delete using (auth.uid() = author_id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), '匿名旅人')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
