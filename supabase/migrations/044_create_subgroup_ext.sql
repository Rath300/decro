-- Create subgroup via SECURITY DEFINER RPC for NextAuth users

BEGIN;

CREATE OR REPLACE FUNCTION public.create_subgroup_ext(
  external_id_param TEXT,
  name_param TEXT,
  slug_param TEXT,
  description_param TEXT DEFAULT NULL,
  cover_image_url_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_subgroup_id UUID;
BEGIN
  IF external_id_param IS NULL OR trim(external_id_param) = '' THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE external_id = external_id_param
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF name_param IS NULL OR length(trim(name_param)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Name must be at least 3 characters');
  END IF;

  v_slug := lower(trim(slug_param));
  v_slug := regexp_replace(v_slug, '[^a-z0-9-]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');

  IF v_slug IS NULL OR length(v_slug) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid slug - must be at least 3 characters');
  END IF;

  IF EXISTS (SELECT 1 FROM public.subgroups WHERE slug = v_slug) THEN
    RETURN json_build_object('success', false, 'error', 'This name/slug is already taken');
  END IF;

  INSERT INTO public.subgroups (
    name,
    slug,
    description,
    cover_image_url,
    created_by
  ) VALUES (
    trim(name_param),
    v_slug,
    NULLIF(trim(description_param), ''),
    cover_image_url_param,
    external_id_param
  )
  RETURNING id, slug INTO v_subgroup_id, v_slug;

  RETURN json_build_object(
    'success', true,
    'id', v_subgroup_id,
    'slug', v_slug
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'This name/slug is already taken');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_subgroup_ext(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
