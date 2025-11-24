-- Comment deletion helper that maps external auth IDs to profile IDs
-- Allows the app to request comment deletion without direct Supabase auth

create or replace function public.delete_comment_ext(
  comment_id_param uuid,
  external_id_param text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_comment_owner uuid;
begin
  -- If the request has a Supabase auth context, ensure it matches the supplied external id
  if auth.uid() is not null and auth.uid()::text <> external_id_param then
    return json_build_object(
      'success', false,
      'error', 'Not authorized to delete this comment'
    );
  end if;

  select id into v_profile_id
  from public.profiles
  where external_id = external_id_param;

  if v_profile_id is null then
    return json_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  end if;

  select user_id into v_comment_owner
  from public.comments
  where id = comment_id_param;

  if v_comment_owner is null then
    return json_build_object(
      'success', false,
      'error', 'Comment not found'
    );
  end if;

  if v_comment_owner <> v_profile_id then
    return json_build_object(
      'success', false,
      'error', 'Cannot delete a comment you do not own'
    );
  end if;

  delete from public.comments
  where id = comment_id_param;

  return json_build_object('success', true);

exception
  when others then
    return json_build_object(
      'success', false,
      'error', 'Unexpected error: ' || SQLERRM
    );
end;
$$;









