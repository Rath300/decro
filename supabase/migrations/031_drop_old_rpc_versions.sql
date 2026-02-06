-- Drop old function versions to avoid ambiguity

BEGIN;

-- Drop old toggle_follow_user (single parameter)
DROP FUNCTION IF EXISTS public.toggle_follow_user(uuid);

-- Drop old is_following_user (single parameter)
DROP FUNCTION IF EXISTS public.is_following_user(uuid);

-- Drop old send_collaboration_request (3 parameters)
DROP FUNCTION IF EXISTS public.send_collaboration_request(uuid, text, text);

-- Drop old get_or_create_conversation (single parameter)
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid);

-- Drop old check_collaboration_status (single parameter)
DROP FUNCTION IF EXISTS public.check_collaboration_status(uuid);

COMMIT;
