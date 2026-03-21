-- Check username mismatch between user table and profiles table
SELECT 
  u.id as user_id,
  u.name as auth_username,
  u.email,
  p.id as profile_id,
  p.username as profile_username,
  p.external_id
FROM "user" u
LEFT JOIN profiles p ON p.external_id = u.id
WHERE u.name != p.username OR p.username IS NULL;
