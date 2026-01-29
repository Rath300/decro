-- =====================================================
-- COMPREHENSIVE PROFILE SYSTEM FIX
-- =====================================================
-- Issues fixed:
-- 1. Create missing profiles for authenticated users
-- 2. Delete all test accounts and orphaned data
-- 3. Add NOT NULL constraint on external_id
-- 4. Improve upsert_profile_from_external function
-- 5. Add automatic profile creation trigger
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create missing profiles for real users
-- =====================================================
DO $$
DECLARE
  v_user RECORD;
  v_username TEXT;
  v_profile_id UUID;
BEGIN
  -- Loop through all Better Auth users without profiles
  FOR v_user IN 
    SELECT 
      u.id,
      u.name,
      u.email
    FROM public."user" u
    LEFT JOIN public.profiles p ON p.external_id = u.id
    WHERE p.id IS NULL
  LOOP
    -- Generate username from name or email
    v_username := COALESCE(
      v_user.name,
      split_part(v_user.email, '@', 1)
    );
    
    -- Ensure username is unique
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
      v_username := v_username || '_' || substring(md5(v_user.id) from 1 for 4);
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (id, external_id, username, full_name, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      v_user.id,
      v_username,
      v_user.name,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_profile_id;
    
    RAISE NOTICE 'Created profile for user: % (username: %)', v_user.email, v_username;
  END LOOP;
END $$;

-- =====================================================
-- STEP 2: Delete all test accounts and orphaned data
-- =====================================================

-- Delete test profiles (ones without external_id)
DELETE FROM public.profiles
WHERE external_id IS NULL;

-- Delete test profiles with specific test IDs
DELETE FROM public.profiles
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
);

-- Delete test user accounts
DELETE FROM public."user"
WHERE id = 'test_external_id_12345';

-- =====================================================
-- STEP 3: Add constraints to prevent future issues
-- =====================================================

-- Make external_id NOT NULL (all profiles MUST have an auth user)
ALTER TABLE public.profiles 
  ALTER COLUMN external_id SET NOT NULL;

-- Add unique constraint on external_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_external_id_key'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_external_id_key UNIQUE (external_id);
  END IF;
END $$;

-- =====================================================
-- STEP 4: Improve upsert_profile_from_external function
-- =====================================================

CREATE OR REPLACE FUNCTION public.upsert_profile_from_external(
  external_id_param TEXT,
  username_param TEXT DEFAULT NULL,
  full_name_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_username TEXT;
  v_existing_username TEXT;
  v_retry_count INT := 0;
BEGIN
  -- Validate input
  IF external_id_param IS NULL OR external_id_param = '' THEN
    RAISE EXCEPTION 'external_id_param cannot be null or empty';
  END IF;
  
  -- Try to find existing profile by external_id
  SELECT id, username INTO v_profile_id, v_existing_username
  FROM public.profiles
  WHERE external_id = external_id_param;
  
  -- If profile exists, update it
  IF v_profile_id IS NOT NULL THEN
    -- Only update full_name, preserve username to avoid conflicts
    UPDATE public.profiles
    SET 
      full_name = COALESCE(full_name_param, full_name),
      updated_at = NOW()
    WHERE id = v_profile_id;
    
    RAISE NOTICE 'Updated existing profile: % (username: %)', v_profile_id, v_existing_username;
    RETURN v_profile_id;
  END IF;
  
  -- Generate a unique username if not provided
  v_username := COALESCE(
    username_param,
    'user_' || substring(external_id_param from 1 for 8)
  );
  
  -- Ensure username is unique by checking and adding suffix if needed
  <<retry_loop>>
  LOOP
    BEGIN
      -- Try to insert new profile
      INSERT INTO public.profiles (id, external_id, username, full_name, created_at, updated_at)
      VALUES (gen_random_uuid(), external_id_param, v_username, full_name_param, NOW(), NOW())
      RETURNING id INTO v_profile_id;
      
      RAISE NOTICE 'Created new profile: % (username: %)', v_profile_id, v_username;
      RETURN v_profile_id;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Username conflict, add random suffix and retry
        v_retry_count := v_retry_count + 1;
        
        IF v_retry_count > 10 THEN
          RAISE EXCEPTION 'Failed to create unique username after 10 attempts';
        END IF;
        
        v_username := COALESCE(username_param, 'user_' || substring(external_id_param from 1 for 8))
                      || '_' || substring(md5(random()::text || v_retry_count::text) from 1 for 4);
        
        RAISE NOTICE 'Username conflict, retrying with: %', v_username;
        CONTINUE retry_loop;
    END;
  END LOOP retry_loop;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error upserting profile for external_id %: %', external_id_param, SQLERRM;
    RAISE;
END;
$$;

-- =====================================================
-- STEP 5: Create trigger for automatic profile creation
-- =====================================================

-- Function to auto-create profile when Better Auth user is created
CREATE OR REPLACE FUNCTION public.auto_create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username TEXT;
  v_profile_id UUID;
BEGIN
  -- Generate username from name or email
  v_username := COALESCE(
    NEW.name,
    split_part(NEW.email, '@', 1),
    'user_' || substring(NEW.id from 1 for 8)
  );
  
  -- Ensure username is unique
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substring(md5(NEW.id) from 1 for 4);
  END IF;
  
  -- Create profile using upsert function (handles conflicts gracefully)
  BEGIN
    v_profile_id := public.upsert_profile_from_external(
      NEW.id,
      v_username,
      NEW.name
    );
    
    RAISE NOTICE 'Auto-created profile % for user %', v_profile_id, NEW.email;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't fail the user creation
      RAISE WARNING 'Failed to auto-create profile for user %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS auto_create_profile_trigger ON public."user";

-- Create trigger on user table
CREATE TRIGGER auto_create_profile_trigger
  AFTER INSERT ON public."user"
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_profile_for_user();

-- =====================================================
-- STEP 6: Add helper function to get profile by external_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_profile_by_external_id(external_id_param TEXT)
RETURNS TABLE(
  id UUID,
  username TEXT,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.external_id,
    p.created_at
  FROM public.profiles p
  WHERE p.external_id = external_id_param;
END;
$$;

-- =====================================================
-- STEP 7: Verify data integrity
-- =====================================================

DO $$
DECLARE
  v_user_count INT;
  v_profile_count INT;
  v_missing_profiles INT;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO v_user_count FROM public."user";
  
  -- Count profiles with external_id
  SELECT COUNT(*) INTO v_profile_count FROM public.profiles WHERE external_id IS NOT NULL;
  
  -- Count users without profiles
  SELECT COUNT(*) INTO v_missing_profiles
  FROM public."user" u
  LEFT JOIN public.profiles p ON p.external_id = u.id
  WHERE p.id IS NULL;
  
  RAISE NOTICE '=== Profile System Status ===';
  RAISE NOTICE 'Total Better Auth users: %', v_user_count;
  RAISE NOTICE 'Total profiles: %', v_profile_count;
  RAISE NOTICE 'Users without profiles: %', v_missing_profiles;
  
  IF v_missing_profiles > 0 THEN
    RAISE WARNING 'There are still % users without profiles!', v_missing_profiles;
  ELSE
    RAISE NOTICE '✅ All users have profiles!';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- Migration complete!
-- =====================================================
