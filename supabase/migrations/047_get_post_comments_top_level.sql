-- Only return top-level comments from get_post_comments.
-- Replies are loaded separately via get_comment_replies_with_nesting.
-- Also expose parent_id so clients can defend against nested rows.

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
      (select count(*)::bigint from public.comment_votes cv where cv.comment_id = c.id and cv.vote = 1),
      0::bigint
    ) as vote_score,
    coalesce(
      (select count(*)::bigint from public.comments replies where replies.parent_id = c.id),
      0::bigint
    ) as reply_count,
    c.parent_id
  from public.comments c
  left join public.profiles p on p.id = c.user_id
  where c.post_id = post_id_param
    and c.parent_id is null
  order by c.created_at desc
  limit greatest(0, page_size)
  offset greatest(0, page_offset);
end;
$$;

grant execute on function public.get_post_comments(uuid, int, int) to authenticated, anon;

comment on function public.get_post_comments(uuid, int, int) is
  'Returns only top-level comments for a post (parent_id IS NULL).';
