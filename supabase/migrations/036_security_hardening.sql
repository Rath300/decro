-- 036_security_hardening.sql
--
-- Closes the authorisation gaps created by authenticating with NextAuth while
-- talking to Postgres as the anon role.
--
-- Because no Supabase JWT is ever minted, `auth.uid()` is always NULL, so every
-- RLS policy written against it silently fails open or closed. Writes therefore
-- travel through SECURITY DEFINER RPCs, which bypass RLS entirely. That leaves
-- the always-true policies in this file as pure attack surface for direct REST
-- writes, and it leaves several features (mark-notification-read, collaboration
-- responses) permanently broken because their RPCs read auth.uid().
--
-- This migration:
--   1. Adds the RPCs the client needs so it never has to write tables directly.
--   2. Replaces the auth.uid()-based collaboration RPCs with _ext variants.
--   3. Drops every always-true policy.
--   4. Restricts read access on feedback and profile_views.
--   5. Pins search_path on every function.
--
-- Callers are still identified by external_id_param. That is only safe because
-- migration 037 revokes EXECUTE from anon/authenticated, leaving the
-- service-role /api/rpc proxy as the sole caller. The proxy takes the id from
-- the server session, never from the request body.

-- ---------------------------------------------------------------- helpers

create or replace function public.app_profile_id(external_id_param text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.profiles where external_id = external_id_param;
$$;

comment on function public.app_profile_id(text) is
  'Resolves a NextAuth external id to a profile UUID. Raises nothing; returns NULL when absent.';

create or replace function public.app_require_profile_id(external_id_param text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if external_id_param is null or length(trim(external_id_param)) = 0 then
    raise exception 'Not authenticated';
  end if;

  select id into v_id from public.profiles where external_id = external_id_param;

  if v_id is null then
    raise exception 'Profile not found for caller';
  end if;

  return v_id;
end;
$$;

-- ------------------------------------------------------------ notifications
-- Both mark-as-read paths in use-notifications.ts wrote the table directly and
-- were blocked by notifications_update_own, which compares against a NULL
-- auth.uid(). notifications.user_id holds a profile UUID as text.

create or replace function public.mark_notification_read_ext(
  external_id_param text,
  notification_id_param uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := public.app_require_profile_id(external_id_param);
begin
  update public.notifications
     set read = true
   where id = notification_id_param
     and user_id = v_profile_id::text;

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read_ext(
  external_id_param text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := public.app_require_profile_id(external_id_param);
  v_count integer;
begin
  with updated as (
    update public.notifications
       set read = true
     where user_id = v_profile_id::text
       and read = false
    returning 1
  )
  select count(*) into v_count from updated;

  return v_count;
end;
$$;

-- ----------------------------------------------------------------- feedback

create or replace function public.submit_feedback_ext(
  external_id_param text,
  category_param text,
  content_param text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_id uuid;
begin
  if content_param is null or length(trim(content_param)) = 0 then
    raise exception 'Feedback content is required';
  end if;

  if length(content_param) > 5000 then
    raise exception 'Feedback is too long';
  end if;

  -- Signed-out feedback is allowed; user_id stays null.
  v_profile_id := public.app_profile_id(external_id_param);

  insert into public.feedback (user_id, category, content)
  values (v_profile_id, coalesce(nullif(trim(category_param), ''), 'general'), trim(content_param))
  returning id into v_id;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------- profiles

create or replace function public.update_profile_ext(
  external_id_param text,
  username_param text,
  full_name_param text,
  bio_param text,
  avatar_url_param text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := public.app_require_profile_id(external_id_param);
  v_username text := nullif(trim(coalesce(username_param, '')), '');
begin
  if v_username is not null then
    if v_username !~ '^[A-Za-z0-9_]{3,30}$' then
      raise exception 'Username must be 3-30 characters, letters, numbers and underscores only';
    end if;

    if exists (
      select 1 from public.profiles
       where lower(username) = lower(v_username)
         and id <> v_profile_id
    ) then
      raise exception 'Username is already taken';
    end if;
  end if;

  update public.profiles
     set username    = coalesce(v_username, username),
         full_name   = coalesce(nullif(trim(coalesce(full_name_param, '')), ''), full_name),
         bio         = coalesce(bio_param, bio),
         avatar_url  = coalesce(nullif(trim(coalesce(avatar_url_param, '')), ''), avatar_url),
         updated_at  = now()
   where id = v_profile_id;

  return v_profile_id;
end;
$$;

-- --------------------------------------------------------------- post tags
-- The edit-post page deleted and re-inserted post_tags directly, which only
-- worked because "System can create tags" was WITH CHECK (true).

create or replace function public.set_post_tags_ext(
  post_id_param uuid,
  external_id_param text,
  tags_param text[]
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := public.app_require_profile_id(external_id_param);
  v_tag text;
  v_tag_id uuid;
  v_slug text;
  v_count integer := 0;
begin
  if not exists (
    select 1 from public.posts
     where id = post_id_param and creator_id = v_profile_id
  ) then
    raise exception 'Post not found or not owned by caller';
  end if;

  delete from public.post_tags where post_id = post_id_param;

  foreach v_tag in array coalesce(tags_param, array[]::text[])
  loop
    v_tag := lower(trim(v_tag));
    continue when v_tag = '' or length(v_tag) > 50;

    v_slug := regexp_replace(v_tag, '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
    continue when v_slug = '';

    -- tags has unique constraints on both name and slug.
    select id into v_tag_id
      from public.tags
     where slug = v_slug or name = v_tag
     limit 1;

    if v_tag_id is null then
      insert into public.tags (name, slug)
      values (v_tag, v_slug)
      on conflict do nothing;

      select id into v_tag_id
        from public.tags
       where slug = v_slug or name = v_tag
       limit 1;
    end if;

    continue when v_tag_id is null;

    insert into public.post_tags (post_id, tag_id)
    values (post_id_param, v_tag_id)
    on conflict do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- --------------------------------------------------------------- spotlight

create or replace function public.delete_spotlight_collection_ext(
  collection_id_param uuid,
  external_id_param text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := public.app_require_profile_id(external_id_param);
begin
  delete from public.spotlight_collections
   where id = collection_id_param
     and (creator_id = v_profile_id or created_by = external_id_param);

  return found;
end;
$$;

-- ----------------------------------------------------------- account delete
-- settings/page.tsx called supabase.auth.admin.deleteUser, which cannot work:
-- these users do not exist in Supabase Auth. It also compared a NextAuth
-- nanoid against uuid columns, so the posts delete never matched.

create or replace function public.delete_account_ext(external_id_param text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := public.app_require_profile_id(external_id_param);
begin
  delete from public.likes where user_id = v_profile_id;
  delete from public.comment_votes where user_id = v_profile_id;
  delete from public.comments where user_id = v_profile_id;
  delete from public.view_events where user_id = v_profile_id;
  delete from public.post_tags
   where post_id in (select id from public.posts where creator_id = v_profile_id);
  delete from public.posts where creator_id = v_profile_id;
  delete from public.spotlight_items
   where collection_id in (
     select id from public.spotlight_collections where creator_id = v_profile_id
   );
  delete from public.spotlight_collections where creator_id = v_profile_id;
  delete from public.follows
   where follower_id = v_profile_id or followee_id = v_profile_id;
  delete from public.subgroup_follows where user_id = external_id_param;
  delete from public.subgroup_moderators
   where user_id = v_profile_id or added_by = v_profile_id;
  delete from public.notifications
   where user_id = v_profile_id::text or actor_id = external_id_param;
  delete from public.messages where sender_id = v_profile_id;
  delete from public.conversation_participants where user_id = v_profile_id;
  delete from public.collaboration_requests
   where sender_id = v_profile_id or receiver_id = v_profile_id;
  delete from public.collaborations
   where user1_id = v_profile_id or user2_id = v_profile_id;
  delete from public.blocked_users
   where blocker_id = v_profile_id or blocked_id = v_profile_id;
  delete from public.search_history where user_id = v_profile_id;
  delete from public.profile_views
   where profile_id = v_profile_id or viewer_id = v_profile_id;
  delete from public.reports
   where reporter_id = v_profile_id or reporter_external_id = external_id_param;
  delete from public.profiles where id = v_profile_id;

  -- Better Auth tables; cascades to "account" and "session".
  delete from public."user" where id = external_id_param;

  return true;
end;
$$;

-- ------------------------------------------------------- collaboration _ext
-- The originals resolve the caller with `auth.uid()::text`, which is always
-- NULL here, so every response, cancel and remove silently no-opped.

create or replace function public.get_collaboration_requests_ext(
  external_id_param text,
  request_type text default 'received'
)
returns table (
  id uuid,
  sender_id uuid,
  sender_username text,
  sender_avatar_url text,
  receiver_id uuid,
  receiver_username text,
  status text,
  message text,
  collaboration_type text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := public.app_require_profile_id(external_id_param);
begin
  return query
  select
    cr.id,
    cr.sender_id,
    ps.username    as sender_username,
    ps.avatar_url  as sender_avatar_url,
    cr.receiver_id,
    pr.username    as receiver_username,
    cr.status,
    cr.message,
    cr.collaboration_type,
    cr.created_at
  from public.collaboration_requests cr
  join public.profiles ps on ps.id = cr.sender_id
  join public.profiles pr on pr.id = cr.receiver_id
  where case when request_type = 'sent'
             then cr.sender_id = v_user_id
             else cr.receiver_id = v_user_id
        end
  order by cr.created_at desc;
end;
$$;

create or replace function public.respond_to_collaboration_request_ext(
  external_id_param text,
  request_id uuid,
  response text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_receiver_id uuid := public.app_require_profile_id(external_id_param);
  v_sender_id uuid;
  v_collab_type text;
  v_collab_id uuid;
  v_receiver_username text;
begin
  if response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined';
  end if;

  select cr.sender_id, cr.collaboration_type
    into v_sender_id, v_collab_type
    from public.collaboration_requests cr
   where cr.id = request_id
     and cr.receiver_id = v_receiver_id
     and cr.status = 'pending';

  if v_sender_id is null then
    return json_build_object('success', false, 'error', 'Request not found or already responded');
  end if;

  update public.collaboration_requests
     set status = response, responded_at = now(), updated_at = now()
   where id = request_id;

  if response <> 'accepted' then
    return json_build_object('success', true, 'message', 'Collaboration request declined');
  end if;

  insert into public.collaborations (user1_id, user2_id, collaboration_type)
  values (
    least(v_sender_id, v_receiver_id),
    greatest(v_sender_id, v_receiver_id),
    v_collab_type
  )
  returning id into v_collab_id;

  select username into v_receiver_username from public.profiles where id = v_receiver_id;

  insert into public.notifications (user_id, type, actor_id, actor_username, message, read)
  values (
    v_sender_id::text,
    'collab_accepted',
    external_id_param,
    v_receiver_username,
    v_receiver_username || ' accepted your collaboration request',
    false
  );

  return json_build_object(
    'success', true,
    'collaboration_id', v_collab_id,
    'message', 'Collaboration request accepted'
  );
end;
$$;

create or replace function public.cancel_collaboration_request_ext(
  external_id_param text,
  request_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender_id uuid := public.app_require_profile_id(external_id_param);
begin
  update public.collaboration_requests
     set status = 'cancelled', updated_at = now()
   where id = request_id
     and sender_id = v_sender_id
     and status = 'pending';

  if found then
    return json_build_object('success', true, 'message', 'Request cancelled');
  end if;

  return json_build_object('success', false, 'error', 'Request not found or cannot be cancelled');
end;
$$;

create or replace function public.remove_collaboration_ext(
  external_id_param text,
  collaboration_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := public.app_require_profile_id(external_id_param);
begin
  delete from public.collaborations
   where id = collaboration_id
     and (user1_id = v_user_id or user2_id = v_user_id);

  if found then
    return json_build_object('success', true, 'message', 'Collaboration removed');
  end if;

  return json_build_object('success', false, 'error', 'Collaboration not found');
end;
$$;

-- ------------------------------------------------------- drop open policies
-- Every policy below is USING (true) or WITH CHECK (true), which means RLS was
-- not restricting the operation at all. The corresponding writes now go through
-- SECURITY DEFINER RPCs, which are unaffected by RLS.

drop policy if exists "Anyone can insert comments"                on public.comments;
drop policy if exists "Users can create feedback"                 on public.feedback;
drop policy if exists "Anyone can delete likes"                   on public.likes;
drop policy if exists "Anyone can insert likes"                   on public.likes;
drop policy if exists "System can create notifications"           on public.notifications;
drop policy if exists notifications_insert_system                 on public.notifications;
drop policy if exists profile_views_insert_allowed                on public.profile_views;
drop policy if exists profiles_insert_all                         on public.profiles;
drop policy if exists profiles_update_all                         on public.profiles;
drop policy if exists spotlight_collections_insert_authenticated  on public.spotlight_collections;
drop policy if exists subgroup_follows_delete_allowed             on public.subgroup_follows;
drop policy if exists subgroup_follows_insert_allowed             on public.subgroup_follows;
drop policy if exists "System can create tags"                    on public.tags;
drop policy if exists view_events_insert_rpc                      on public.view_events;

-- ------------------------------------------------------ restrict reads
-- Feedback may contain private reports; profile_views is a per-user audit log.
-- Both were world-readable via a plain REST select.

drop policy if exists "Feedback is viewable by everyone" on public.feedback;
drop policy if exists feedback_select_public             on public.feedback;
drop policy if exists profile_views_select_own           on public.profile_views;

-- subgroup_moderators had RLS on with no policy at all, so moderator badges
-- could never load. Membership is public information; writes go through RPCs.
drop policy if exists subgroup_moderators_select_all on public.subgroup_moderators;
create policy subgroup_moderators_select_all
  on public.subgroup_moderators for select using (true);

-- The trending materialized view is exposed over the REST API and bypasses the
-- policies on posts. Reads go through get_trending_posts instead.
revoke all on public.trending_posts from anon, authenticated;

-- --------------------------------------------------------- search_path pin
-- A mutable search_path lets a caller who can create objects in an earlier
-- schema shadow the tables a SECURITY DEFINER function resolves.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and (
         p.proconfig is null
         or not exists (
           select 1 from unnest(p.proconfig) c where c like 'search\_path=%'
         )
       )
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;
