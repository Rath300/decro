-- 040_liked_posts_privacy.sql
--
-- get_user_liked_posts_ext(external_id_param) returns the posts a given user has
-- liked. It was left executable by anon in migration 037 because it looked like
-- a public read, but the argument names *which* user, and nothing in the body
-- checks that it is the caller. With the anon key in the browser bundle, anyone
-- could enumerate any account's likes.
--
-- The one call site (search page, "liked" filter) only ever asks for the signed-in
-- user's own likes, so it now goes through /api/rpc, which supplies the identity
-- from the session cookie.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'get_user_liked_posts_ext'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
