import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Server-authoritative RPC proxy.
//
// Every function reachable here is SECURITY DEFINER and identifies the acting
// user through an argument. Previously the browser supplied that argument with
// the anon key, so any caller could act as any user. Now the functions are only
// executable by service_role (migration 037) and this route overwrites the
// identity argument with the id from the NextAuth session cookie, which the
// client cannot forge.
//
// Adding a function to ALLOWLIST is the only way to expose it. Anything not
// listed is rejected, so a new RPC cannot be reached by accident.

export const dynamic = 'force-dynamic'

type IdentityKind = 'external' | 'profile'

type RpcSpec = {
  /** Argument that carries the caller's identity, overwritten server-side. */
  identityParam?: string
  /** `external` injects the NextAuth id; `profile` injects the profile UUID. */
  identityKind?: IdentityKind
  /** When false, signed-out callers are allowed and identity is sent as null. */
  requiresAuth?: boolean
}

const EXTERNAL = (identityParam: string, requiresAuth = true): RpcSpec => ({
  identityParam,
  identityKind: 'external',
  requiresAuth,
})

const PROFILE = (identityParam: string): RpcSpec => ({
  identityParam,
  identityKind: 'profile',
  requiresAuth: true,
})

const ALLOWLIST: Record<string, RpcSpec> = {
  // Posts.
  create_post_ext: EXTERNAL('external_id_param'),
  update_post_ext: EXTERNAL('external_id_param'),
  delete_post_ext: EXTERNAL('external_id_param'),
  set_post_tags_ext: EXTERNAL('external_id_param'),

  // Engagement.
  toggle_like_ext: EXTERNAL('external_id_param'),
  add_comment_ext: EXTERNAL('external_id_param'),
  add_reply_ext: EXTERNAL('external_id_param'),
  update_comment_ext: EXTERNAL('external_id_param'),
  delete_comment_ext: EXTERNAL('external_id_param'),
  toggle_comment_vote_ext: EXTERNAL('external_id_param'),

  // Views. Anonymous visitors are counted, so identity may be null.
  track_view: EXTERNAL('external_id_param', false),
  track_profile_view: EXTERNAL('viewer_id_param', false),

  // Profile lifecycle.
  upsert_profile_from_external: EXTERNAL('external_id_param'),
  ensure_profile: EXTERNAL('external_id_param'),
  update_profile_ext: EXTERNAL('external_id_param'),
  delete_account_ext: EXTERNAL('external_id_param'),

  // Notifications.
  mark_notification_read_ext: EXTERNAL('external_id_param'),
  mark_all_notifications_read_ext: EXTERNAL('external_id_param'),

  // Follows.
  toggle_follow_user: PROFILE('current_user_id'),
  toggle_follow_subgroup_ext: EXTERNAL('external_id_param'),

  // Subgroups.
  create_subgroup_ext: EXTERNAL('external_id_param'),

  // Spotlight.
  create_spotlight_collection_ext_with_items: EXTERNAL('external_id_param'),
  add_post_to_spotlight_ext: EXTERNAL('external_id_param'),
  delete_spotlight_collection_ext: EXTERNAL('external_id_param'),

  // Connections (friend requests; same tables as the old "collaboration" feature).
  check_collaboration_status: PROFILE('current_user_id'),
  send_collaboration_request: PROFILE('sender_profile_id'),
  respond_to_collaboration_request_ext: EXTERNAL('external_id_param'),
  cancel_collaboration_request_ext: EXTERNAL('external_id_param'),
  remove_collaboration_ext: EXTERNAL('external_id_param'),
  get_collaboration_requests_ext: EXTERNAL('external_id_param'),
  get_user_network: PROFILE('user_profile_id'),

  // Direct messages.
  get_or_create_conversation_ext: EXTERNAL('external_id_1'),
  get_or_create_conversation_with_profile_ext: EXTERNAL('external_id_param'),
  get_user_conversations_ext: EXTERNAL('external_id_param'),
  get_conversation_messages_ext: EXTERNAL('external_id_param'),
  send_message_ext: EXTERNAL('external_id_param'),
  mark_messages_read_ext: EXTERNAL('external_id_param'),

  // Moderation and misc.
  block_user_ext: EXTERNAL('external_id_param'),
  unblock_user_ext: EXTERNAL('external_id_param'),
  get_blocked_users_ext: EXTERNAL('external_id_param'),
  create_report_ext: EXTERNAL('external_id_param'),
  submit_feedback_ext: EXTERNAL('external_id_param', false),
  save_search_history_ext: EXTERNAL('external_id_param'),
  get_search_history_ext: EXTERNAL('external_id_param'),
  // "What did I like" reads. The id argument names whose likes to return and the
  // bodies do not check it against the caller, so these are identity-injected
  // rather than left anon-callable (migration 041).
  get_user_liked_posts_ext: EXTERNAL('external_id_param'),
  get_user_likes_ext: EXTERNAL('external_id_param'),
  get_user_liked_comment_ids: EXTERNAL('external_id_param'),
}

async function resolveProfileId(externalId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle()

  if (error || !data) return null
  return (data as { id: string }).id
}

export async function POST(request: Request) {
  let body: { fn?: unknown; args?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const fn = typeof body.fn === 'string' ? body.fn : null
  if (!fn) {
    return NextResponse.json({ error: 'Missing "fn"' }, { status: 400 })
  }

  const spec = ALLOWLIST[fn]
  if (!spec) {
    return NextResponse.json(
      { error: `RPC "${fn}" is not callable from the client` },
      { status: 403 }
    )
  }

  const args: Record<string, unknown> =
    body.args && typeof body.args === 'object' && !Array.isArray(body.args)
      ? { ...(body.args as Record<string, unknown>) }
      : {}

  const session = await getServerSession(authOptions)
  const externalId = session?.user?.id ?? null

  if (spec.requiresAuth !== false && !externalId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (spec.identityParam) {
    if (!externalId) {
      args[spec.identityParam] = null
    } else if (spec.identityKind === 'profile') {
      const profileId = await resolveProfileId(externalId)
      if (!profileId) {
        return NextResponse.json(
          { error: 'Profile not found for session' },
          { status: 409 }
        )
      }
      args[spec.identityParam] = profileId
    } else {
      args[spec.identityParam] = externalId
    }
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[api/rpc] admin client unavailable:', error?.message)
    return NextResponse.json(
      { error: 'Server is not configured for database writes' },
      { status: 500 }
    )
  }

  const { data, error } = await admin.rpc(fn, args)

  if (error) {
    console.error(`[api/rpc] ${fn} failed:`, error.message)
    // Postgres RAISE messages are written for end users ("Username is already
    // taken"), so they are safe to surface.
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}
