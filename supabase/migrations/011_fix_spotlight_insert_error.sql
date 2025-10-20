-- Fix the "INSERT has more target columns than expressions" error in spotlight creation
-- This migration updates the create_spotlight_collection_ext_with_items function

-- Drop and recreate the function with proper column handling
drop function if exists public.create_spotlight_collection_ext_with_items(text, text, text, text, uuid[]);

create or replace function public.create_spotlight_collection_ext_with_items(
  title_param text,
  description_param text,
  cover_image_url_param text,
  external_id_param text,
  post_ids_param uuid[]
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid;
  v_collection_id uuid;
  v_post_id uuid;
  v_order_index integer := 0;
begin
  -- Get profile ID from external ID using ensure_profile function for consistency
  select id into v_profile_id 
  from public.profiles 
  where external_id = external_id_param;
  
  if v_profile_id is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;

  -- Insert spotlight collection with only the columns we're explicitly providing
  -- This avoids any issues with missing columns or extra columns
  insert into public.spotlight_collections (
    title,
    description,
    cover_image_url,
    created_by,
    creator_id
  ) values (
    title_param,
    description_param,
    cover_image_url_param,
    external_id_param,
    v_profile_id
  ) returning id into v_collection_id;

  -- Insert spotlight items if any post IDs provided
  if array_length(post_ids_param, 1) > 0 then
    foreach v_post_id in array post_ids_param
    loop
      -- Check if post exists before inserting
      if exists (select 1 from public.posts where id = v_post_id) then
        insert into public.spotlight_items (
          collection_id,
          post_id,
          order_index
        ) values (
          v_collection_id,
          v_post_id,
          v_order_index
        );
        v_order_index := v_order_index + 1;
      end if;
    end loop;
  end if;

  return json_build_object('success', true, 'collection_id', v_collection_id);
end;
$$;
