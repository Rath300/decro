-- Migration: Add get_user_likes_ext function
-- Description: Allows fetching user's liked posts using external_id (NextAuth user ID)
-- Date: 2024-12-11

-- Drop existing function if it exists
drop function if exists public.get_user_likes_ext(text);

-- Create function to get all liked post IDs for a user (by external_id)
create or replace function public.get_user_likes_ext(external_id_param text)
returns table(post_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_uuid uuid;
begin
  -- Get the profile UUID from external_id
  select id into profile_uuid
  from public.profiles
  where external_id = external_id_param;
  
  -- If profile doesn't exist, return empty
  if profile_uuid is null then
    return;
  end if;
  
  -- Return all liked post IDs for this user
  return query
  select l.post_id
  from public.likes l
  where l.user_id = profile_uuid
  order by l.created_at desc;
end;
$$;

-- Grant execute permission
grant execute on function public.get_user_likes_ext to authenticated, anon;

-- Add comment for documentation
comment on function public.get_user_likes_ext is 'Fetches all liked post IDs for a user by their external_id (NextAuth user ID)';
