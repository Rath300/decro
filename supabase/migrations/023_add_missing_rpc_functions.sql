-- Migration: Add missing RPC functions
-- Description: Create upsert_profile_from_external and get_trending_posts functions
-- Date: 2024-12-11

-- Drop all existing versions of upsert_profile_from_external
drop function if exists public.upsert_profile_from_external(text);
drop function if exists public.upsert_profile_from_external(text, text);
drop function if exists public.upsert_profile_from_external(text, text, text);
drop function if exists public.upsert_profile_from_external(text, text, text, text);

-- 1. Create upsert_profile_from_external function
create or replace function public.upsert_profile_from_external(
  external_id_param text,
  username_param text default null,
  full_name_param text default null,
  email_param text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  -- Try to find existing profile
  select id into v_profile_id
  from public.profiles
  where external_id = external_id_param;
  
  -- If profile exists, update it
  if v_profile_id is not null then
    update public.profiles
    set 
      username = coalesce(username_param, username),
      full_name = coalesce(full_name_param, full_name),
      email = coalesce(email_param, email),
      updated_at = now()
    where id = v_profile_id;
    
    return v_profile_id;
  else
    -- Create new profile
    insert into public.profiles (external_id, username, full_name, email)
    values (external_id_param, username_param, full_name_param, email_param)
    returning id into v_profile_id;
    
    return v_profile_id;
  end if;
exception
  when others then
    -- Log error and return null
    raise warning 'Error upserting profile: %', SQLERRM;
    return null;
end;
$$;

-- 2. Create get_trending_posts function
create or replace function public.get_trending_posts(
  page_size int default 20,
  page_offset int default 0,
  time_window_hours int default 168 -- 7 days default
)
returns table(
  id uuid,
  title text,
  description text,
  content_type text,
  media_url text,
  audio_url text,
  video_url text,
  creator_id uuid,
  creator_username text,
  created_at timestamptz,
  views bigint,
  like_count bigint,
  comment_count bigint,
  is_curated boolean,
  subgroup_id uuid,
  tags text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    p.id,
    p.title,
    p.description,
    p.content_type,
    p.media_url,
    p.audio_url,
    p.video_url,
    p.creator_id,
    prof.username as creator_username,
    p.created_at,
    p.views,
    coalesce((select count(*) from public.likes l where l.post_id = p.id), 0) as like_count,
    coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
    p.is_curated,
    p.subgroup_id,
    coalesce(
      (select array_agg(t.name) 
       from public.post_tags pt 
       join public.tags t on t.id = pt.tag_id 
       where pt.post_id = p.id), 
      array[]::text[]
    ) as tags
  from public.posts p
  left join public.profiles prof on prof.id = p.creator_id
  where p.created_at >= now() - (time_window_hours || ' hours')::interval
  order by 
    (
      (coalesce(p.views, 0) * 1.0) +
      (coalesce((select count(*) from public.likes l where l.post_id = p.id), 0) * 5.0) +
      (coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) * 3.0)
    ) desc,
    p.created_at desc
  limit greatest(0, page_size)
  offset greatest(0, page_offset);
end;
$$;

-- Grant execute permissions
grant execute on function public.upsert_profile_from_external to authenticated, anon;
grant execute on function public.get_trending_posts to authenticated, anon;

-- Add comments
comment on function public.upsert_profile_from_external is 'Creates or updates a profile using external_id (NextAuth user ID)';
comment on function public.get_trending_posts is 'Returns trending posts based on views, likes, and comments within a time window';
