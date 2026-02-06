-- =====================================================
-- FIX RPC FUNCTIONS FOR BETTER AUTH
-- =====================================================
-- Problem: RPCs use auth.uid() which is NULL for Better Auth
-- Solution: Accept current_user_id parameter explicitly
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Fix toggle_follow_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.toggle_follow_user(
  target_user_id UUID,
  current_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_following BOOLEAN;
  v_follower_profile_id UUID;
BEGIN
  -- Get current user's profile ID from external_id if not provided
  IF current_user_id IS NULL THEN
    -- Try to get from JWT (Better Auth)
    SELECT id INTO v_follower_profile_id
    FROM public.profiles
    WHERE external_id = current_setting('request.jwt.claims', true)::json->>'sub';
    
    IF v_follower_profile_id IS NULL THEN
      RAISE EXCEPTION 'User not authenticated or profile not found';
    END IF;
  ELSE
    v_follower_profile_id := current_user_id;
  END IF;
  
  -- Check if already following
  SELECT true INTO v_exists
  FROM public.follows
  WHERE follower_id = v_follower_profile_id AND followee_id = target_user_id;
  
  IF v_exists THEN
    -- Unfollow
    DELETE FROM public.follows
    WHERE follower_id = v_follower_profile_id AND followee_id = target_user_id;
    v_following := false;
  ELSE
    -- Follow
    INSERT INTO public.follows(follower_id, followee_id)
    VALUES (v_follower_profile_id, target_user_id);
    v_following := true;
  END IF;
  
  RETURN json_build_object('following', v_following);
END;
$$;

-- =====================================================
-- 2. Fix is_following_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_following_user(
  target_user_id UUID,
  current_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_profile_id UUID;
BEGIN
  -- Get current user's profile ID
  IF current_user_id IS NULL THEN
    SELECT id INTO v_follower_profile_id
    FROM public.profiles
    WHERE external_id = current_setting('request.jwt.claims', true)::json->>'sub';
    
    IF v_follower_profile_id IS NULL THEN
      RETURN false;
    END IF;
  ELSE
    v_follower_profile_id := current_user_id;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = v_follower_profile_id AND followee_id = target_user_id
  );
END;
$$;

-- =====================================================
-- 3. Fix send_collaboration_request
-- =====================================================
CREATE OR REPLACE FUNCTION public.send_collaboration_request(
  receiver_profile_id UUID,
  message_text TEXT DEFAULT NULL,
  collab_type TEXT DEFAULT 'general',
  sender_profile_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_request_id UUID;
  v_sender_username TEXT;
BEGIN
  -- Get sender's profile ID
  IF sender_profile_id IS NULL THEN
    SELECT id INTO v_sender_id
    FROM public.profiles
    WHERE external_id = current_setting('request.jwt.claims', true)::json->>'sub';
    
    IF v_sender_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Sender profile not found');
    END IF;
  ELSE
    v_sender_id := sender_profile_id;
  END IF;
  
  -- Get sender username for notification
  SELECT username INTO v_sender_username
  FROM public.profiles
  WHERE id = v_sender_id;
  
  -- Check if already collaborating or request exists
  IF EXISTS (
    SELECT 1 FROM public.collaborations
    WHERE (user1_id = v_sender_id AND user2_id = receiver_profile_id)
       OR (user1_id = receiver_profile_id AND user2_id = v_sender_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already collaborating');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.collaboration_requests
    WHERE sender_id = v_sender_id AND receiver_id = receiver_profile_id AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Request already sent');
  END IF;
  
  -- Create request
  INSERT INTO public.collaboration_requests (sender_id, receiver_id, message, collaboration_type, status)
  VALUES (v_sender_id, receiver_profile_id, message_text, collab_type, 'pending')
  RETURNING id INTO v_request_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, actor_id, actor_username, message, read)
  SELECT 
    p.external_id,
    'collab_request',
    v_sender_id::text,
    v_sender_username,
    message_text,
    false
  FROM public.profiles p
  WHERE p.id = receiver_profile_id;
  
  RETURN json_build_object('success', true, 'request_id', v_request_id);
END;
$$;

-- =====================================================
-- 4. Fix get_or_create_conversation
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  other_user_id UUID,
  current_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Get current user's profile ID
  IF current_user_id IS NULL THEN
    SELECT id INTO v_current_user_id
    FROM public.profiles
    WHERE external_id = current_setting('request.jwt.claims', true)::json->>'sub';
    
    IF v_current_user_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'User profile not found');
    END IF;
  ELSE
    v_current_user_id := current_user_id;
  END IF;
  
  -- Try to find existing conversation
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  INNER JOIN public.conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_current_user_id
  INNER JOIN public.conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  LIMIT 1;
  
  -- Create new conversation if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (created_at, updated_at, last_message_at)
    VALUES (NOW(), NOW(), NOW())
    RETURNING id INTO v_conversation_id;
    
    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id, joined_at, last_read_at)
    VALUES
      (v_conversation_id, v_current_user_id, NOW(), NOW()),
      (v_conversation_id, other_user_id, NOW(), NOW());
  END IF;
  
  RETURN json_build_object('success', true, 'conversation_id', v_conversation_id);
END;
$$;

-- =====================================================
-- 5. Fix check_collaboration_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_collaboration_status(
  other_user_id UUID,
  current_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_status TEXT;
  v_request_id UUID;
BEGIN
  -- Get current user's profile ID
  IF current_user_id IS NULL THEN
    SELECT id INTO v_current_user_id
    FROM public.profiles
    WHERE external_id = current_setting('request.jwt.claims', true)::json->>'sub';
    
    IF v_current_user_id IS NULL THEN
      RETURN json_build_object('status', 'none', 'can_send_request', false);
    END IF;
  ELSE
    v_current_user_id := current_user_id;
  END IF;
  
  -- Check if already collaborating
  IF EXISTS (
    SELECT 1 FROM public.collaborations
    WHERE (user1_id = v_current_user_id AND user2_id = other_user_id)
       OR (user1_id = other_user_id AND user2_id = v_current_user_id)
  ) THEN
    RETURN json_build_object('status', 'collaborating', 'can_send_request', false);
  END IF;
  
  -- Check for outgoing request
  SELECT id INTO v_request_id
  FROM public.collaboration_requests
  WHERE sender_id = v_current_user_id AND receiver_id = other_user_id AND status = 'pending';
  
  IF v_request_id IS NOT NULL THEN
    RETURN json_build_object('status', 'request_sent', 'can_send_request', false, 'request_id', v_request_id);
  END IF;
  
  -- Check for incoming request
  SELECT id INTO v_request_id
  FROM public.collaboration_requests
  WHERE sender_id = other_user_id AND receiver_id = v_current_user_id AND status = 'pending';
  
  IF v_request_id IS NOT NULL THEN
    RETURN json_build_object('status', 'request_received', 'can_send_request', false, 'request_id', v_request_id);
  END IF;
  
  -- No relationship
  RETURN json_build_object('status', 'none', 'can_send_request', true);
END;
$$;

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
