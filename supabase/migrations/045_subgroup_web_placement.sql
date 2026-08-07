-- Persist pitch-web placement for user-created subgroups (free local cosine).
-- parent_hub_id is a taxonomy hub id (e.g. photography) or sg:<uuid> for a user hub.

BEGIN;

ALTER TABLE public.subgroups
  ADD COLUMN IF NOT EXISTS web_depth integer,
  ADD COLUMN IF NOT EXISTS placed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.subgroup_parents (
  child_id uuid NOT NULL REFERENCES public.subgroups(id) ON DELETE CASCADE,
  parent_hub_id text NOT NULL,
  rank smallint NOT NULL DEFAULT 1,
  score real,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, parent_hub_id),
  CONSTRAINT subgroup_parents_rank_chk CHECK (rank >= 1 AND rank <= 2)
);

CREATE INDEX IF NOT EXISTS subgroup_parents_parent_idx
  ON public.subgroup_parents (parent_hub_id);

CREATE INDEX IF NOT EXISTS subgroups_placed_at_idx
  ON public.subgroups (placed_at)
  WHERE placed_at IS NOT NULL;

-- Readable by everyone (graph is public in pitch mode); writes via service role only.
ALTER TABLE public.subgroup_parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subgroup_parents_select_public ON public.subgroup_parents;
CREATE POLICY subgroup_parents_select_public ON public.subgroup_parents
  FOR SELECT USING (true);

COMMIT;
