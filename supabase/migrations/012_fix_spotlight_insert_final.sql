-- Final fix for spotlight creation - completely rebuild the function
-- This ensures there are no column mismatches and handles all edge cases

-- Drop all existing versions of this function to ensure clean recreation
drop function if exists public.create_spotlight_collection_ext_with_items(text, text, text, text, uuid[]);

-- First, let's add the missing external_id column to profiles if it doesn't exist
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'external_id'
    ) then
        alter table public.profiles add column external_id text unique;
    end if;
end $$;

-- Now create the function with proper error handling and column specification
create or replace function public.create_spotlight_collection_ext_with_items(
    title_param text,
    description_param text,
    cover_image_url_param text,
    external_id_param text,
    post_ids_param uuid[]
)
returns json 
language plpgsql 
security definer 
set search_path = public 
as $$
declare
    v_profile_id uuid;
    v_collection_id uuid;
    v_post_id uuid;
    v_order_index integer := 0;
    v_result json;
begin
    -- Get or create profile ID from external ID
    select id into v_profile_id 
    from public.profiles 
    where external_id = external_id_param;
    
    if v_profile_id is null then
        -- Try to create profile if it doesn't exist
        begin
            insert into public.profiles (id, external_id)
            values (gen_random_uuid(), external_id_param)
            returning id into v_profile_id;
        exception when others then
            -- If insert fails, return error
            return json_build_object(
                'success', false, 
                'error', 'Could not find or create profile for user: ' || external_id_param
            );
        end;
    end if;
    
    -- Insert spotlight collection with explicit column mapping
    -- Only insert into specific columns to avoid "INSERT has more target columns than expressions" error
    begin
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
    exception when others then
        return json_build_object(
            'success', false, 
            'error', 'Failed to create spotlight collection: ' || SQLERRM
        );
    end;

    -- Insert spotlight items if any post IDs provided
    if post_ids_param is not null and array_length(post_ids_param, 1) > 0 then
        foreach v_post_id in array post_ids_param
        loop
            -- Validate post exists before inserting
            if exists (select 1 from public.posts where id = v_post_id) then
                begin
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
                exception when others then
                    -- Log error but continue with other items
                    raise notice 'Failed to insert spotlight item for post_id %: %', v_post_id, SQLERRM;
                end;
            else
                raise notice 'Post with id % does not exist, skipping', v_post_id;
            end if;
        end loop;
    end if;

    return json_build_object(
        'success', true, 
        'collection_id', v_collection_id,
        'items_added', v_order_index
    );

exception when others then
    return json_build_object(
        'success', false, 
        'error', 'Unexpected error: ' || SQLERRM
    );
end;
$$;
