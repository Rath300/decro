-- Migration: Fix toggle_like_ext function
-- Description: Fix logic bug causing likes to always return false
-- Date: 2024-12-11

-- Drop and recreate the toggle_like_ext function with fixed logic
create or replace function public.toggle_like_ext(post_id_param uuid, external_id_param text)
returns json 
language plpgsql 
security definer 
set search_path = public
as $$
declare 
  v_profile_id uuid;
  v_like_count integer;
begin
  -- Map external ID to profile ID
  select id into v_profile_id 
  from public.profiles 
  where external_id = external_id_param;
  
  -- If profile doesn't exist, try to create it
  if v_profile_id is null then
    insert into public.profiles (external_id) 
    values (external_id_param) 
    returning id into v_profile_id;
  end if;
  
  -- Check if like exists using COUNT (more reliable than boolean)
  select count(*) into v_like_count
  from public.likes 
  where post_id = post_id_param and user_id = v_profile_id;
  
  -- If like exists (count > 0), delete it
  if v_like_count > 0 then
    delete from public.likes 
    where post_id = post_id_param and user_id = v_profile_id;
    return json_build_object('liked', false);
  else
    -- Otherwise, insert new like
    insert into public.likes (post_id, user_id) 
    values (post_id_param, v_profile_id)
    on conflict (post_id, user_id) do nothing; -- Handle race conditions
    return json_build_object('liked', true);
  end if;
end;
$$;

-- Grant execute permission
grant execute on function public.toggle_like_ext to authenticated, anon;

-- Add comment
comment on function public.toggle_like_ext is 'Toggles like state for a post using external_id. Returns {liked: true/false} based on final state.';
