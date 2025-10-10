-- Compatibility adjustments and additional RPCs used by app

-- Add creator_id and views columns if missing
alter table public.posts add column if not exists creator_id uuid;
alter table public.posts add column if not exists views bigint default 0;

-- Ensure creator_id and user_id mirror each other on insert
create or replace function public.posts_sync_creator_user()
returns trigger language plpgsql as $$
begin
  if new.user_id is null and new.creator_id is not null then
    new.user_id := new.creator_id;
  end if;
  if new.creator_id is null and new.user_id is not null then
    new.creator_id := new.user_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_posts_sync_creator_user on public.posts;
create trigger trg_posts_sync_creator_user
before insert on public.posts
for each row execute function public.posts_sync_creator_user();

-- Increment posts.views as well during track_view to satisfy UI expectations
create or replace function public.track_view(post_id_param uuid, user_id_param uuid)
returns void language plpgsql as $$
begin
  insert into public.view_events(post_id, user_id) values (post_id_param, user_id_param);
  update public.post_aggregates set views_count = views_count + 1 where post_id = post_id_param;
  update public.posts set views = coalesce(views,0) + 1 where id = post_id_param;
end; $$;

-- Popular tags (drop-recreate if signature differs)
drop function if exists public.get_popular_tags(int);
create or replace function public.get_popular_tags(limit_count int)
returns table(id uuid, name text, slug text, usage_count bigint) language sql as $$
  select t.id, t.name, t.slug, count(pt.post_id) as usage_count
  from public.tags t
  left join public.post_tags pt on pt.tag_id = t.id
  group by t.id, t.name, t.slug
  order by usage_count desc, t.name asc
  limit greatest(0, limit_count);
$$;

-- Simple counters
create or replace function public.get_like_count(post_id_param uuid)
returns bigint language sql as $$
  select count(*) from public.likes where post_id = post_id_param;
$$;

create or replace function public.get_comment_count(post_id_param uuid)
returns bigint language sql as $$
  select count(*) from public.comments where post_id = post_id_param;
$$;

-- Following helpers
create or replace function public.is_following_user(target_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.follows
    where follower_id = auth.uid() and followee_id = target_user_id
  );
$$;

create or replace function public.toggle_follow_user(target_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_exists boolean; v_following boolean;
begin
  select true into v_exists from public.follows where follower_id = auth.uid() and followee_id = target_user_id;
  if v_exists then
    delete from public.follows where follower_id = auth.uid() and followee_id = target_user_id;
    v_following := false;
  else
    insert into public.follows(follower_id, followee_id) values (auth.uid(), target_user_id);
    v_following := true;
  end if;
  return json_build_object('following', v_following);
end; $$;

-- User stats
create or replace function public.get_user_stats(user_id_param uuid)
returns table(
  post_count bigint,
  follower_count bigint,
  following_count bigint,
  total_likes bigint,
  total_views bigint
) language sql as $$
  with posts_cte as (
    select id from public.posts where creator_id = user_id_param
  )
  select
    (select count(*) from posts_cte) as post_count,
    (select count(*) from public.follows where followee_id = user_id_param) as follower_count,
    (select count(*) from public.follows where follower_id = user_id_param) as following_count,
    (select count(*) from public.likes where post_id in (select id from posts_cte)) as total_likes,
    (select coalesce(sum(views),0) from public.posts where creator_id = user_id_param) as total_views;
$$;

-- Search by tags (slugs)
create or replace function public.search_posts_by_tags(tag_slugs text[], page_size int, page_offset int)
returns table(
  id uuid,
  title text,
  description text,
  content_type text,
  media_url text,
  creator_id uuid,
  creator_username text,
  subgroup_name text,
  views bigint,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz,
  tags text[]
) language sql as $$
  with tag_ids as (
    select array_agg(id) as ids from public.tags where slug = any(tag_slugs)
  )
  select p.id, p.title, p.description, p.content_type, p.media_url,
         p.creator_id, pr.username as creator_username, sg.name as subgroup_name,
         coalesce(p.views,0) as views,
         (select count(*) from public.likes l where l.post_id = p.id) as like_count,
         (select count(*) from public.comments c where c.post_id = p.id) as comment_count,
         p.created_at,
         (
           select array_agg(t.name)
           from public.post_tags pt join public.tags t on t.id = pt.tag_id
           where pt.post_id = p.id
         ) as tags
  from public.posts p
  join tag_ids ti on true
  join public.post_tags pt on pt.post_id = p.id and pt.tag_id = any(ti.ids)
  left join public.profiles pr on pr.id = p.creator_id
  left join public.subgroups sg on sg.id = p.subgroup_id
  group by p.id, pr.username, sg.name
  order by p.created_at desc
  limit greatest(0, page_size) offset greatest(0, page_offset);
$$;

-- Keyword search (FTS) aligned with UI param names
create or replace function public.search_posts(search_query text, page_size int, page_offset int)
returns table(
  id uuid,
  title text,
  description text,
  content_type text,
  media_url text,
  creator_id uuid,
  creator_username text,
  subgroup_name text,
  views bigint,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz,
  tags text[]
) language sql as $$
  with base as (
    select p.*, to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.description,'')) as doc
    from public.posts p
  )
  select b.id, b.title, b.description, b.content_type, b.media_url,
         b.creator_id, pr.username as creator_username, sg.name as subgroup_name,
         coalesce(b.views,0) as views,
         (select count(*) from public.likes l where l.post_id = b.id) as like_count,
         (select count(*) from public.comments c where c.post_id = b.id) as comment_count,
         b.created_at,
         (
           select array_agg(t.name)
           from public.post_tags pt join public.tags t on t.id = pt.tag_id
           where pt.post_id = b.id
         ) as tags
  from base b
  left join public.profiles pr on pr.id = b.creator_id
  left join public.subgroups sg on sg.id = b.subgroup_id
  where (search_query is null or search_query = '' or b.doc @@ plainto_tsquery('simple', search_query))
  order by case when search_query is null or search_query = '' then b.created_at end desc,
           case when search_query is not null and search_query <> '' then ts_rank(b.doc, plainto_tsquery('simple', search_query)) end desc
  limit greatest(0, page_size) offset greatest(0, page_offset);
$$;


