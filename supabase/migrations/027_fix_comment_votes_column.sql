-- Migration: Fix get_post_comments to use correct column name
-- Description: Change cv.direction to cv.vote since comment_votes table has 'vote' column not 'direction'
-- Date: 2024-12-11

-- Drop and recreate with correct column reference
drop function if exists public.get_post_comments(uuid, int, int);

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
      (select count(*) from public.comment_votes cv where cv.comment_id = c.id and cv.vote = 1),
      0
    ) as vote_score,
    coalesce(
      (select count(*) from public.comments replies where replies.parent_id = c.id),
      0
    ) as reply_count
  from public.comments c
  left join public.profiles p on p.id = c.user_id
  where c.post_id = post_id_param
  order by c.created_at desc
  limit greatest(0, page_size)
  offset greatest(0, page_offset);
end;
$$;

grant execute on function public.get_post_comments to authenticated, anon;

comment on function public.get_post_comments is 'Returns all comments for a post with corrected vote column reference';
