-- 037_revoke_client_rpc_execute.sql
--
-- Closes the impersonation hole.
--
-- Every function below is SECURITY DEFINER and takes the acting user as an
-- argument (`external_id_param`, `sender_profile_id`, ...). Nothing in the
-- function body verifies that the argument belongs to the caller. Because the
-- functions were executable by `anon`, and the anon key ships inside the
-- browser bundle, anyone could call them as any user: like as them, comment as
-- them, create posts as them, or delete their posts.
--
-- After this migration the only role that can execute them is `service_role`,
-- which is used exclusively by /api/rpc. That route resolves the caller from
-- the NextAuth session cookie server-side and overwrites any identity argument
-- the client supplied, so the argument can no longer be forged.
--
-- ORDER OF OPERATIONS: deploy the app with SUPABASE_SERVICE_ROLE_KEY set before
-- applying this. Mutations will fail until /api/rpc is live.
--
-- The list also covers reads that return another user's private data
-- (conversations, messages, collaboration requests, blocked users, search
-- history), which were readable for any profile id by any anonymous caller.

do $$
declare
  fn text;
  r record;
  -- Writes.
  mutating text[] := array[
    'add_comment',
    'add_comment_ext',
    'add_post_to_spotlight_ext',
    'add_reply_ext',
    'block_user_ext',
    'unblock_user_ext',
    'cancel_collaboration_request',
    'cancel_collaboration_request_ext',
    'create_post_ext',
    'create_report_ext',
    'create_spotlight_collection_ext',
    'create_spotlight_collection_ext_with_items',
    'create_subgroup_ext',
    'delete_account_ext',
    'delete_comment_ext',
    'delete_post_ext',
    'delete_spotlight_collection_ext',
    'ensure_profile',
    'ensure_profile_exists',
    'get_or_create_conversation',
    'get_or_create_conversation_ext',
    'get_or_create_tag',
    'mark_all_notifications_read_ext',
    'mark_notification_read_ext',
    'mark_messages_read',
    'mark_messages_read_ext',
    'refresh_trending_posts',
    'remove_collaboration',
    'remove_collaboration_ext',
    'respond_to_collaboration_request',
    'respond_to_collaboration_request_ext',
    'save_search_history_ext',
    'send_collaboration_request',
    'send_message',
    'send_message_ext',
    'set_post_tags_ext',
    'submit_feedback_ext',
    'toggle_comment_vote_ext',
    'toggle_follow_subgroup',
    'toggle_follow_subgroup_ext',
    'toggle_follow_user',
    'toggle_like',
    'toggle_like_ext',
    'track_profile_view',
    'track_view',
    'update_comment_ext',
    'update_post_ext',
    'update_profile_ext',
    'upsert_profile_from_external',
    -- Identity helpers: no reason to expose the external-id to profile mapping.
    'app_profile_id',
    'app_require_profile_id'
  ];
  -- Reads that return data belonging to a specific user.
  private_reads text[] := array[
    'get_blocked_users_ext',
    'get_collaboration_requests',
    'get_collaboration_requests_ext',
    'get_conversation_messages',
    'get_conversation_messages_ext',
    'get_search_history_ext',
    'get_user_conversations',
    'get_user_conversations_ext',
    'get_user_network'
  ];
begin
  foreach fn in array mutating || private_reads
  loop
    for r in
      select p.oid::regprocedure as sig
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = fn
    loop
      -- PUBLIC holds the default EXECUTE grant, so revoking anon/authenticated
      -- alone would leave the function callable.
      execute format('revoke all on function %s from public, anon, authenticated', r.sig);
      execute format('grant execute on function %s to service_role', r.sig);
    end loop;
  end loop;
end $$;

-- The dashboard-created triggers that write notifications run as table owner,
-- so they are unaffected by the revokes above.
