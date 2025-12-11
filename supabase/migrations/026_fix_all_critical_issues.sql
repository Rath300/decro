-- Migration: Fix comments not showing, spotlight delete, and other issues
-- Description: Multiple critical fixes
-- Date: 2024-12-11

-- 1. Fix get_post_comments to return ALL comments (revert parent_id filter)
-- The parent_id filter was breaking comments entirely
create or replace function public.get_post_comments(
  post_id_param uuid,
  page_size int default 20,
  page_offset int default 0
)
returns table(
  id uuid,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  vote_score bigint,
  reply_count bigint,
  parent_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    c.id,
    c.content,
    c.created_at,
    c.updated_at,
    c.user_id,
    coalesce(p.username, 'anonymous') as username,
    p.full_name,
    p.avatar_url,
    coalesce(
      (select count(*) from public.comment_votes cv where cv.comment_id = c.id and cv.direction = 1),
      0
    ) as vote_score,
    coalesce(
      (select count(*) from public.comments replies where replies.parent_id = c.id),
      0
    ) as reply_count,
    c.parent_id
  from public.comments c
  left join public.profiles p on p.id = c.user_id
  where c.post_id = post_id_param
    -- NO parent_id filter - return ALL comments
    -- Client-side will handle filtering/nesting
  order by c.created_at desc
  limit greatest(0, page_size)
  offset greatest(0, page_offset);
end;
$$;

-- Grant permissions
grant execute on function public.get_post_comments to authenticated, anon;

-- 2. Fix spotlight delete RLS policy to work with external_id (NextAuth)
drop policy if exists "spotlight_collections_delete_own" on public.spotlight_collections;

create policy "spotlight_collections_delete_own" on public.spotlight_collections for delete using (
  created_by in (
    select external_id from public.profiles where id = creator_id
  )
  or
  creator_id in (
    select id from public.profiles where external_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  or
  creator_id in (
    select id from public.profiles where external_id = auth.uid()::text
  )
);

-- Add comment
comment on function public.get_post_comments is 'Returns ALL comments for a post including replies. Client handles nesting.';
comment on policy "spotlight_collections_delete_own" on public.spotlight_collections is 'Allows deleting own spotlights using NextAuth external_id';
