-- =====================================================
-- Fix ALL RLS policies for Better Auth
-- =====================================================
-- Better Auth stores user IDs in JWT 'sub' claim, not auth.uid()
-- This migration updates all RLS policies to use request.jwt.claims

BEGIN;

-- =====================================================
-- 1. CREATE HELPER FUNCTION TO GET CURRENT EXTERNAL_ID
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_external_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );
$$;

-- =====================================================
-- 2. CREATE HELPER FUNCTION TO GET CURRENT PROFILE_ID
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.profiles 
  WHERE external_id = public.get_current_external_id()
  LIMIT 1;
$$;

-- =====================================================
-- 3. FIX PROFILES RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles 
  FOR UPDATE 
  USING (external_id = public.get_current_external_id())
  WITH CHECK (external_id = public.get_current_external_id());

-- =====================================================
-- 4. FIX POSTS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS posts_modify_own ON public.posts;
CREATE POLICY posts_insert_auth ON public.posts 
  FOR INSERT 
  WITH CHECK (
    user_id = public.get_current_profile_id()
  );

CREATE POLICY posts_update_own ON public.posts 
  FOR UPDATE 
  USING (user_id = public.get_current_profile_id())
  WITH CHECK (user_id = public.get_current_profile_id());

CREATE POLICY posts_delete_own ON public.posts 
  FOR DELETE 
  USING (user_id = public.get_current_profile_id());

-- =====================================================
-- 5. FIX COMMENTS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS comments_insert_auth ON public.comments;
DROP POLICY IF EXISTS comments_modify_own ON public.comments;
DROP POLICY IF EXISTS comments_delete_own ON public.comments;

CREATE POLICY comments_insert_auth ON public.comments 
  FOR INSERT 
  WITH CHECK (user_id = public.get_current_profile_id());

CREATE POLICY comments_update_own ON public.comments 
  FOR UPDATE 
  USING (user_id = public.get_current_profile_id())
  WITH CHECK (user_id = public.get_current_profile_id());

CREATE POLICY comments_delete_own ON public.comments 
  FOR DELETE 
  USING (user_id = public.get_current_profile_id());

-- =====================================================
-- 6. FIX LIKES RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS likes_upsert_own ON public.likes;

CREATE POLICY likes_insert_own ON public.likes 
  FOR INSERT 
  WITH CHECK (user_id = public.get_current_profile_id());

CREATE POLICY likes_delete_own ON public.likes 
  FOR DELETE 
  USING (user_id = public.get_current_profile_id());

-- =====================================================
-- 7. FIX FOLLOWS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS follows_upsert_own ON public.follows;

CREATE POLICY follows_insert_own ON public.follows 
  FOR INSERT 
  WITH CHECK (follower_id = public.get_current_profile_id());

CREATE POLICY follows_delete_own ON public.follows 
  FOR DELETE 
  USING (follower_id = public.get_current_profile_id());

-- =====================================================
-- 8. FIX NOTIFICATIONS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

CREATE POLICY notifications_select_own ON public.notifications 
  FOR SELECT 
  USING (user_id = public.get_current_profile_id());

CREATE POLICY notifications_update_own ON public.notifications 
  FOR UPDATE 
  USING (user_id = public.get_current_profile_id())
  WITH CHECK (user_id = public.get_current_profile_id());

-- =====================================================
-- 9. FIX REPORTS RLS POLICY
-- =====================================================
DROP POLICY IF EXISTS reports_insert_auth ON public.reports;

CREATE POLICY reports_insert_auth ON public.reports 
  FOR INSERT 
  WITH CHECK (reporter_id = public.get_current_profile_id());

-- =====================================================
-- 10. CREATE MISSING track_view RPC FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_view(
  post_id_param UUID,
  user_id_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Get profile ID if user is provided
  IF user_id_param IS NOT NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE external_id = user_id_param;
  END IF;

  -- Insert view event (allow duplicates, we'll aggregate later)
  INSERT INTO public.view_events (post_id, user_id, created_at)
  VALUES (post_id_param, v_profile_id, NOW());
  
  -- Update post aggregates if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_aggregates') THEN
    INSERT INTO public.post_aggregates (post_id, views)
    VALUES (post_id_param, 1)
    ON CONFLICT (post_id) 
    DO UPDATE SET 
      views = post_aggregates.views + 1,
      updated_at = NOW();
  END IF;
  
  -- Also increment views directly on posts table
  UPDATE public.posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = post_id_param;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail view tracking to not disrupt user experience
    RAISE WARNING 'Failed to track view: %', SQLERRM;
END;
$$;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION public.track_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_external_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_profile_id TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION public.get_current_external_id IS 'Returns external_id from JWT sub claim (Better Auth user ID)';
COMMENT ON FUNCTION public.get_current_profile_id IS 'Returns profile UUID for current Better Auth user';
COMMENT ON FUNCTION public.track_view IS 'Tracks post view and increments view count';

COMMIT;
