-- Core schema: tables, functions, triggers (idempotent where possible)
-- NOTE: Policies are in 002_rls.sql

-- Profiles
create table if not exists public.profiles (
  id uuid primary key,
  username text unique,
  name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Subgroups
create table if not exists public.subgroups (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  cover_url text,
  created_at timestamptz default now()
);

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subgroup_id uuid references public.subgroups(id) on delete set null,
  title text not null,
  description text,
  content_type text not null,
  media_url text not null,
  audio_url text,
  video_url text,
  is_curated boolean default false,
  created_at timestamptz default now()
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Likes
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  source_id text,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- Follows
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id)
);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  actor_id uuid,
  actor_username text,
  post_id uuid,
  comment_id uuid,
  spotlight_id uuid,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text default 'open',
  created_at timestamptz default now()
);

-- View events and aggregates
create table if not exists public.view_events (
  id bigserial primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.post_aggregates (
  post_id uuid primary key references public.posts(id) on delete cascade,
  views_count bigint default 0,
  likes_count bigint default 0,
  comments_count bigint default 0
);

-- Ensure aggregates row on post insert
create or replace function public.ensure_post_aggregate()
returns trigger language plpgsql as $$
begin
  insert into public.post_aggregates(post_id)
  values (new.id)
  on conflict (post_id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_posts_ensure_aggregate on public.posts;
create trigger trg_posts_ensure_aggregate
after insert on public.posts
for each row execute function public.ensure_post_aggregate();

-- Maintain likes_count
create or replace function public.bump_likes_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.post_aggregates set likes_count = likes_count + 1 where post_id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.post_aggregates set likes_count = greatest(0, likes_count - 1) where post_id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_likes_count_ins on public.likes;
create trigger trg_likes_count_ins
after insert on public.likes
for each row execute function public.bump_likes_count();

drop trigger if exists trg_likes_count_del on public.likes;
create trigger trg_likes_count_del
after delete on public.likes
for each row execute function public.bump_likes_count();

-- Maintain comments_count
create or replace function public.bump_comments_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.post_aggregates set comments_count = comments_count + 1 where post_id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.post_aggregates set comments_count = greatest(0, comments_count - 1) where post_id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_comments_count_ins on public.comments;
create trigger trg_comments_count_ins
after insert on public.comments
for each row execute function public.bump_comments_count();

drop trigger if exists trg_comments_count_del on public.comments;
create trigger trg_comments_count_del
after delete on public.comments
for each row execute function public.bump_comments_count();

-- Track view RPC + maintain views_count
create or replace function public.track_view(post_id_param uuid, user_id_param uuid)
returns void language sql as $$
  insert into public.view_events(post_id, user_id) values (post_id_param, user_id_param);
  update public.post_aggregates set views_count = views_count + 1 where post_id = post_id_param;
$$;

-- get_user_liked_posts RPC (simple version)
create or replace function public.get_user_liked_posts(user_id_param uuid, page_size int, page_offset int)
returns table(id uuid, title text) language sql as $$
  select p.id, p.title
  from public.likes l
  join public.posts p on p.id = l.post_id
  where l.user_id = user_id_param
  order by l.created_at desc
  limit greatest(0, page_size) offset greatest(0, page_offset);
$$;

-- FTS support index (safe if exists via do block)
do $$ begin
  perform 1 from pg_indexes where schemaname = 'public' and indexname = 'posts_fts_idx';
  if not found then
    create index posts_fts_idx on public.posts using gin (
      to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
    );
  end if;
end $$;

-- search_posts RPC (keyword + tags)
create or replace function public.search_posts(query text, tag_ids uuid[], page_size int, page_offset int)
returns table(
  id uuid,
  title text,
  description text,
  content_type text,
  media_url text,
  created_at timestamptz,
  rank real
) language sql as $$
  with base as (
    select p.*, to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.description,'')) as doc
    from public.posts p
    where (
      query is null or query = '' or to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.description,'')) @@ plainto_tsquery('simple', query)
    )
    and (
      tag_ids is null or array_length(tag_ids,1) is null
      or exists (
        select 1 from public.post_tags pt where pt.post_id = p.id and pt.tag_id = any(tag_ids)
      )
    )
  )
  select id, title, description, content_type, media_url, created_at,
         (ts_rank(doc, plainto_tsquery('simple', query))) as rank
  from base
  order by case when query is null or query = '' then created_at end desc,
           case when query is not null and query <> '' then rank end desc
  limit greatest(0, page_size) offset greatest(0, page_offset);
$$;

-- get_trending_posts RPC (simple: likes + comments in last 7 days)
create or replace function public.get_trending_posts(page_size int, time_window text)
returns table(id uuid, score numeric) language sql as $$
  with recent as (
    select pa.post_id as id,
      (pa.likes_count*1.0 + pa.comments_count*1.5 + pa.views_count*0.1) as score
    from public.post_aggregates pa
  )
  select id, score from recent
  order by score desc
  limit greatest(0, page_size);
$$;

-- Helper: get_or_create_tag
create or replace function public.get_or_create_tag(tag_name text)
returns uuid language plpgsql as $$
declare v_id uuid; v_slug text;
begin
  v_slug := lower(regexp_replace(tag_name, '[^a-zA-Z0-9]+', '-', 'g'));
  select id into v_id from public.tags where slug = v_slug;
  if v_id is null then
    insert into public.tags(name, slug) values (tag_name, v_slug) returning id into v_id;
  end if;
  return v_id;
end; $$;

-- Toggle like helper (used by app); returns {liked: bool}
create or replace function public.toggle_like(post_id_param uuid, user_id_param uuid)
returns json language plpgsql as $$
declare v_exists boolean;
begin
  select true into v_exists from public.likes where post_id = post_id_param and user_id = user_id_param;
  if v_exists then
    delete from public.likes where post_id = post_id_param and user_id = user_id_param;
    return '{"liked": false}'::json;
  else
    insert into public.likes(post_id, user_id) values (post_id_param, user_id_param);
    return '{"liked": true}'::json;
  end if;
end; $$;

-- Feed RPC (simplified; adapt as needed for joins)
create or replace function public.get_feed_posts(
  page_size int,
  page_offset int,
  subgroup_filter uuid,
  content_type_filter text,
  sort_by text
)
returns table(
  id uuid,
  title text,
  media_url text,
  audio_url text,
  video_url text,
  content_type text,
  creator_username text,
  created_at timestamptz,
  is_curated boolean,
  views bigint,
  subgroup_id uuid
) language sql as $$
  select p.id, p.title, p.media_url, p.audio_url, p.video_url, p.content_type,
         pr.username as creator_username, p.created_at, p.is_curated,
         coalesce(pa.views_count,0) as views, p.subgroup_id
  from public.posts p
  left join public.post_aggregates pa on pa.post_id = p.id
  left join public.profiles pr on pr.id = p.user_id
  where (subgroup_filter is null or p.subgroup_id = subgroup_filter)
    and (content_type_filter is null or p.content_type = content_type_filter)
  order by case when sort_by = 'created_at' then p.created_at end desc,
           case when sort_by = 'likes' then coalesce(pa.likes_count,0) end desc,
           case when sort_by = 'comments' then coalesce(pa.comments_count,0) end desc
  limit greatest(0, page_size) offset greatest(0, page_offset);
$$;

-- Indexes
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_user on public.posts(user_id);
create index if not exists idx_posts_subgroup on public.posts(subgroup_id);
create index if not exists idx_comments_post on public.comments(post_id, created_at desc);
create index if not exists idx_likes_post on public.likes(post_id);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_follows_followee on public.follows(followee_id);

