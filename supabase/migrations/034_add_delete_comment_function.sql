-- Function to delete a comment (owner only)
CREATE OR REPLACE FUNCTION public.delete_comment_ext(
  comment_id_param UUID,
  external_id_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_comment_user_id UUID;
  v_deleted_count INT;
BEGIN
  -- Get profile ID from external_id
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE external_id = external_id_param;
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- Get comment owner
  SELECT user_id INTO v_comment_user_id
  FROM public.comments
  WHERE id = comment_id_param;
  
  IF v_comment_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Comment not found');
  END IF;
  
  -- Check ownership
  IF v_comment_user_id != v_profile_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to delete this comment');
  END IF;
  
  -- Delete the comment (cascade will handle replies via FK)
  DELETE FROM public.comments
  WHERE id = comment_id_param
  AND user_id = v_profile_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RETURN json_build_object('success', true, 'deleted_id', comment_id_param);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Comment not found or already deleted');
  END IF;
END;
$$;
