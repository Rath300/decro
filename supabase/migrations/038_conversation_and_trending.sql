-- 038_conversation_and_trending.sql
--
-- Follow-ups to 036:
--   1. A conversation opener the UI can actually call.
--   2. Make refresh_trending_posts safe to call when the view is missing.
--   3. Stop the media bucket from being listable.

-- ------------------------------------------------------------- conversations
-- get_or_create_conversation_ext takes two external ids, but every caller
-- (MessageButton, the profile page) only has the other user's profile UUID.
-- get_or_create_conversation resolves the caller with auth.uid() and so always
-- failed. This variant takes the caller from the session and the other side as
-- a profile id.

create or replace function public.get_or_create_conversation_with_profile_ext(
  external_id_param text,
  other_profile_id_param uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_self_id uuid := public.app_require_profile_id(external_id_param);
  v_conversation_id uuid;
begin
  if other_profile_id_param is null or other_profile_id_param = v_self_id then
    raise exception 'Pick a different person to message';
  end if;

  if not exists (select 1 from public.profiles where id = other_profile_id_param) then
    raise exception 'User not found';
  end if;

  -- Blocking in either direction prevents a new thread.
  if exists (
    select 1 from public.blocked_users
     where (blocker_id = v_self_id and blocked_id = other_profile_id_param)
        or (blocker_id = other_profile_id_param and blocked_id = v_self_id)
  ) then
    raise exception 'You cannot message this user';
  end if;

  select cp1.conversation_id
    into v_conversation_id
    from public.conversation_participants cp1
    join public.conversation_participants cp2
      on cp2.conversation_id = cp1.conversation_id
   where cp1.user_id = v_self_id
     and cp2.user_id = other_profile_id_param
   limit 1;

  if v_conversation_id is null then
    insert into public.conversations default values returning id into v_conversation_id;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation_id, v_self_id), (v_conversation_id, other_profile_id_param);
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_conversation_with_profile_ext(text, uuid)
  from public, anon, authenticated;
grant execute on function public.get_or_create_conversation_with_profile_ext(text, uuid)
  to service_role;

-- ---------------------------------------------------------------- trending
-- The cron route calls this every 30 minutes. Make a missing materialized view
-- a logged no-op instead of an unhandled 500, and report what happened.

-- Previously returned void; the cron route needs to know whether it ran.
drop function if exists public.refresh_trending_posts();

create function public.refresh_trending_posts()
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'trending_posts'
       and c.relkind = 'm'
  ) then
    return json_build_object('refreshed', false, 'reason', 'trending_posts view does not exist');
  end if;

  refresh materialized view public.trending_posts;
  return json_build_object('refreshed', true, 'at', now());
end;
$$;

revoke all on function public.refresh_trending_posts() from public, anon, authenticated;
grant execute on function public.refresh_trending_posts() to service_role;

-- ------------------------------------------------------------------ storage
-- The media bucket had four problems:
--   * "Anon upload media" was WITH CHECK (bucket_id = 'media'), so any
--     anonymous caller could upload any file of any size.
--   * "Authenticated upload media" tested auth.role() = 'authenticated', which
--     is never true here, so it did nothing.
--   * "Public read media" granted SELECT on storage.objects, which allows
--     listing every uploaded object rather than fetching known URLs.
--   * The bucket had no size limit and no MIME allowlist.
--
-- Uploads now go through /api/upload/sign, which checks the session and issues a
-- signed upload URL. Signed uploads are authorised by their token rather than by
-- RLS, so no INSERT policy is needed. The bucket is public, so files continue to
-- be served from /storage/v1/object/public/... without a SELECT policy.

drop policy if exists "Anon upload media"          on storage.objects;
drop policy if exists "Authenticated upload media" on storage.objects;
drop policy if exists "Authenticated update media" on storage.objects;
drop policy if exists "Public read media"          on storage.objects;

update storage.buckets
   set file_size_limit = 524288000, -- 500MB, the video ceiling
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
         'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg',
         'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
         'video/mp4', 'video/webm', 'video/quicktime'
       ]
 where id = 'media';
