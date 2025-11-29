-- Fix like and comment functions to work with external IDs

-- Create toggle_like_ext function that accepts external ID
create or replace function public.toggle_like_ext(post_id_param uuid, external_id_param text)
returns json language plpgsql security definer as $$
declare 
  v_profile_id uuid;
  v_exists boolean;
begin
  -- Map external ID to profile ID
  select id into v_profile_id from public.profiles where external_id = external_id_param;
  
  if v_profile_id is null then
    -- Try to create profile if it doesn't exist
    insert into public.profiles (external_id) values (external_id_param) returning id into v_profile_id;
  end if;
  
  -- Check if like exists
  select true into v_exists from public.likes where post_id = post_id_param and user_id = v_profile_id;
  
  if v_exists then
    delete from public.likes where post_id = post_id_param and user_id = v_profile_id;
    return '{"liked": false}'::json;
  else
    insert into public.likes(post_id, user_id) values (post_id_param, v_profile_id);
    return '{"liked": true}'::json;
  end if;
end; $$;

-- Create add_reply_ext function that accepts external ID
create or replace function public.add_reply_ext(comment_id_param uuid, external_id_param text, content_param text)
returns void language plpgsql security definer as $$
declare
  v_profile_id uuid;
  v_post_id uuid;
  v_username text;
begin
  -- Map external ID to profile ID
  select id, username into v_profile_id, v_username from public.profiles where external_id = external_id_param;
  
  if v_profile_id is null then
    raise exception 'Profile not found for external_id: %', external_id_param;
  end if;
  
  -- Get the post_id from the parent comment
  select post_id into v_post_id from public.comments where id = comment_id_param;
  
  if v_post_id is null then
    raise exception 'Parent comment not found: %', comment_id_param;
  end if;
  
  -- Insert the reply
  insert into public.comments (post_id, user_id, content, parent_id, username)
  values (v_post_id, v_profile_id, content_param, comment_id_param, v_username);
end; $$;

-- Create get_comment_replies_with_nesting function
create or replace function public.get_comment_replies_with_nesting(
  comment_id_param uuid,
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
  replying_to_username text
) language sql as $$
  select 
    c.id,
    c.content,
    c.created_at,
    c.updated_at,
    c.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    coalesce(
      (select count(*) from public.likes l where l.post_id = c.id),
      0
    ) as vote_score,
    (select count(*) from public.comments replies where replies.parent_id = c.id) as reply_count,
    (
      select p2.username 
      from public.comments parent_comment
      join public.profiles p2 on p2.id = parent_comment.user_id
      where parent_comment.id = comment_id_param
    ) as replying_to_username
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.parent_id = comment_id_param
  order by c.created_at desc
  limit page_size
  offset page_offset;
$$;

-- Grant execute permissions
grant execute on function public.toggle_like_ext to authenticated, anon;
grant execute on function public.add_reply_ext to authenticated, anon;
grant execute on function public.get_comment_replies_with_nesting to authenticated, anon;

