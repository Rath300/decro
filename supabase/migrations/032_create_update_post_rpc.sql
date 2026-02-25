-- Create update_post_ext RPC function to fix edit permission issue

BEGIN;

CREATE OR REPLACE FUNCTION public.update_post_ext(
  post_id_param UUID,
  external_id_param TEXT,
  title_param TEXT,
  description_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_creator_id UUID;
BEGIN
  -- Get profile ID from external_id
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE external_id = external_id_param;
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- Check if user owns the post
  SELECT creator_id INTO v_creator_id
  FROM public.posts
  WHERE id = post_id_param;
  
  IF v_creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Post not found');
  END IF;
  
  IF v_creator_id != v_profile_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only edit your own posts');
  END IF;
  
  -- Update the post
  UPDATE public.posts
  SET 
    title = title_param,
    description = description_param,
    updated_at = NOW()
  WHERE id = post_id_param;
  
  RETURN json_build_object('success', true);
END;
$$;

COMMIT;
