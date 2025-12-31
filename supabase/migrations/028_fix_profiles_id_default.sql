-- Migration: FIX CRITICAL - Add default UUID generator to profiles.id
-- Description: profiles table missing default gen_random_uuid() causing new user creation to fail
-- Date: 2024-12-24
-- Issue: "null value in column "id" of relation "profiles" violates not-null constraint"

-- Add default UUID generator to profiles.id column
alter table public.profiles 
alter column id set default gen_random_uuid();

-- Comment
comment on column public.profiles.id is 'Primary key with auto-generated UUID (fixed 2024-12-24)';

-- Verify: This should now work for new profile creation
-- Test: INSERT INTO public.profiles (external_id, username) VALUES ('test123', 'testuser') RETURNING id;
