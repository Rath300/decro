-- Migration: Fix comment duplication by ensuring get_post_comments only returns top-level comments
-- Description: Modify get_post_comments to filter out replies (parent_id IS NULL)
-- Date: 2024-12-11

-- Drop existing function
drop function if exists public.get_post_comments(uuid, int, int);

-- Recreate with proper parent_id filtering
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
  reply_count bigint
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
    ) as reply_count
  from public.comments c
  left join public.profiles p on p.id = c.user_id
  where c.post_id = post_id_param
    and c.parent_id is null  -- ONLY top-level comments, not replies
  order by c.created_at desc
  limit greatest(0, page_size)
  offset greatest(0, page_offset);
end;
$$;

-- Grant permissions
grant execute on function public.get_post_comments to authenticated, anon;

-- Add comment
comment on function public.get_post_comments is 'Returns only top-level comments for a post (parent_id IS NULL). Replies are fetched separately via get_comment_replies_with_nesting.';
