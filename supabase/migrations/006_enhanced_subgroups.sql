-- Enhanced Subgroup Features
-- Add missing tables and functions for Reddit-style subgroup functionality

-- Add missing columns to subgroups table
alter table public.subgroups add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.subgroups add column if not exists cover_image_url text;
alter table public.subgroups add column if not exists rules text;
alter table public.subgroups add column if not exists is_private boolean default false;
alter table public.subgroups add column if not exists member_count bigint default 0;
alter table public.subgroups add column if not exists post_count bigint default 0;

-- Create subgroup follows table
create table if not exists public.subgroup_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subgroup_id uuid not null references public.subgroups(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, subgroup_id)
);

-- Create subgroup moderators table
create table if not exists public.subgroup_moderators (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subgroup_id uuid not null references public.subgroups(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  primary key (user_id, subgroup_id)
);

-- Enable RLS on new tables
alter table public.subgroup_follows enable row level security;
alter table public.subgroup_moderators enable row level security;

-- Subgroup follows policies
create policy "subgroup_follows_select_all" on public.subgroup_follows for select using (true);
create policy "subgroup_follows_insert_own" on public.subgroup_follows for insert with check (user_id = auth.uid());
create policy "subgroup_follows_delete_own" on public.subgroup_follows for delete using (user_id = auth.uid());

-- Subgroup moderators policies
create policy "subgroup_moderators_select_all" on public.subgroup_moderators for select using (true);
create policy "subgroup_moderators_insert_creator" on public.subgroup_moderators for insert with check (
  exists (
    select 1 from public.subgroups 
    where id = subgroup_id and created_by = auth.uid()
  ) or
  exists (
    select 1 from public.subgroup_moderators 
    where subgroup_id = subgroup_id and user_id = auth.uid()
  )
);

-- Functions for subgroup following
create or replace function public.is_following_subgroup_ext(target_subgroup_id uuid, external_id_param uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.subgroup_follows
    where subgroup_id = target_subgroup_id and user_id = external_id_param
  );
$$;

create or replace function public.toggle_follow_subgroup_ext(target_subgroup_id uuid, external_id_param uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_exists boolean; v_following boolean;
begin
  select true into v_exists from public.subgroup_follows where subgroup_id = target_subgroup_id and user_id = external_id_param;
  if v_exists then
    delete from public.subgroup_follows where subgroup_id = target_subgroup_id and user_id = external_id_param;
    v_following := false;
    
    -- Update subgroup member count
    update public.subgroups 
    set member_count = greatest(0, member_count - 1) 
    where id = target_subgroup_id;
  else
    insert into public.subgroup_follows(subgroup_id, user_id) values (target_subgroup_id, external_id_param);
    v_following := true;
    
    -- Update subgroup member count
    update public.subgroups 
    set member_count = member_count + 1 
    where id = target_subgroup_id;
  end if;
  return json_build_object('following', v_following);
end; $$;

-- Function to get subgroup stats
create or replace function public.get_subgroup_stats(subgroup_id_param uuid)
returns table(
  member_count bigint,
  post_count bigint,
  created_at timestamptz,
  creator_username text
) language sql as $$
  select 
    s.member_count,
    s.post_count,
    s.created_at,
    p.username as creator_username
  from public.subgroups s
  left join public.profiles p on p.id = s.created_by
  where s.id = subgroup_id_param;
$$;

-- Function to check if user is moderator
create or replace function public.is_subgroup_moderator(subgroup_id_param uuid, user_id_param uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.subgroup_moderators 
    where subgroup_id = subgroup_id_param and user_id = user_id_param
    union
    select exists(
      select 1 from public.subgroups 
      where id = subgroup_id_param and created_by = user_id_param
    )
  );
$$;

-- Trigger to update post count when posts are added/removed
create or replace function public.update_subgroup_post_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.subgroups 
    set post_count = post_count + 1 
    where id = new.subgroup_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.subgroups 
    set post_count = greatest(0, post_count - 1) 
    where id = old.subgroup_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists trg_update_subgroup_post_count on public.posts;
create trigger trg_update_subgroup_post_count
after insert or delete on public.posts
for each row execute function public.update_subgroup_post_count();

-- Indexes for performance
create index if not exists idx_subgroup_follows_user on public.subgroup_follows(user_id);
create index if not exists idx_subgroup_follows_subgroup on public.subgroup_follows(subgroup_id);
create index if not exists idx_subgroup_moderators_user on public.subgroup_moderators(user_id);
create index if not exists idx_subgroup_moderators_subgroup on public.subgroup_moderators(subgroup_id);
