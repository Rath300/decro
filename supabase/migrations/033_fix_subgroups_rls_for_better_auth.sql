-- Drop old RLS policies that use auth.uid() (doesn't work with Better Auth)
DROP POLICY IF EXISTS subgroups_insert_authenticated ON public.subgroups;
DROP POLICY IF EXISTS subgroups_insert_auth ON public.subgroups;
DROP POLICY IF EXISTS subgroups_update_own ON public.subgroups;
DROP POLICY IF EXISTS subgroups_update_creator ON public.subgroups;

-- Create new INSERT policy for Better Auth
-- Allow authenticated users to insert, and verify they set created_by to their own external_id
CREATE POLICY subgroups_insert_better_auth ON public.subgroups
  FOR INSERT
  TO public
  WITH CHECK (
    -- Get external_id from JWT 'sub' claim
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      ''
    ) = created_by
  );

-- Create new UPDATE policy for Better Auth
-- Allow creator or moderators to update
CREATE POLICY subgroups_update_better_auth ON public.subgroups
  FOR UPDATE
  TO public
  USING (
    created_by = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      ''
    )
    OR EXISTS (
      SELECT 1 FROM subgroup_moderators sm
      JOIN profiles p ON p.id = sm.user_id
      WHERE sm.subgroup_id = subgroups.id
      AND p.external_id = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
      )
    )
  );
