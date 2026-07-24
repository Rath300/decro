-- 041_lockdown_triggers_and_meta.sql
--
-- Three leftovers the security advisor flagged after 036-040.

-- ------------------------------------------------------- schema_migrations
-- The migration ledger created by scripts/db-apply.mjs landed in `public` with
-- RLS off, so it was readable (and writable) through the REST API by anon. It is
-- server-side bookkeeping and has no business being exposed at all: db-apply.mjs
-- connects as the Postgres superuser over the direct connection, which ignores
-- both RLS and these grants.

alter table if exists public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from anon, authenticated;

-- ---------------------------------------------------------- like-state reads
-- These return "which posts/comments did user X like". The id is an argument and
-- the bodies never check it against the caller, so with the anon key any visitor
-- could enumerate any account's likes. All three call sites only ever ask about
-- the signed-in user, so they now go through /api/rpc.

do $$
declare
  fn text;
  r record;
  private_reads text[] := array[
    'get_user_likes_ext',
    'get_user_likes',
    'get_user_liked_comment_ids'
  ];
begin
  foreach fn in array private_reads
  loop
    for r in
      select p.oid::regprocedure as sig
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = fn
    loop
      execute format('revoke all on function %s from public, anon, authenticated', r.sig);
      execute format('grant execute on function %s to service_role', r.sig);
    end loop;
  end loop;
end $$;

-- ------------------------------------------------------- trigger functions
-- Every function returning `trigger` was directly callable by anon. Triggers are
-- fired by the executor without an EXECUTE privilege check, so revoking here does
-- not affect them firing — it only removes the ability to invoke them by hand,
-- e.g. calling update_tag_usage_count() or handle_new_user() to corrupt counters
-- and aggregates, or notify_* to forge notifications.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- public.profile_views has RLS enabled with no policies, which the advisor
-- reports as INFO. That is intentional and fail-closed: rows are written only by
-- track_profile_view (SECURITY DEFINER) and read only by the owner-scoped policy
-- added in 036, so no broad policy is wanted here.
