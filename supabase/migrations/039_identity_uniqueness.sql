-- 039_identity_uniqueness.sql
--
-- Signup checked username availability with a SELECT and then inserted, with
-- nothing in between to stop two concurrent signups from claiming the same name.
-- There was no unique constraint on "user".name at all, and the check was
-- case-insensitive while the (absent) constraint would not have been.
--
-- This matters more now that sign-in accepts a username: two users sharing a
-- name would make the lookup ambiguous, and LIMIT 1 would pick arbitrarily.
--
-- profiles.username had the same gap, so update_profile_ext's uniqueness check
-- was also racy.
--
-- Verified free of duplicates before adding.

create unique index if not exists user_name_lower_key
  on public."user" (lower(trim(name)))
  where name is not null;

create unique index if not exists user_email_lower_key
  on public."user" (lower(trim(email)))
  where email is not null;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));
