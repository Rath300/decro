-- Lightweight per-subgroup chat for pitch / community rooms.

BEGIN;

CREATE TABLE IF NOT EXISTS public.subgroup_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subgroup_id uuid NOT NULL REFERENCES public.subgroups(id) ON DELETE CASCADE,
  author_external_id text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subgroup_chat_content_len CHECK (
    char_length(trim(content)) >= 1 AND char_length(content) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS subgroup_chat_subgroup_created_idx
  ON public.subgroup_chat_messages (subgroup_id, created_at DESC);

ALTER TABLE public.subgroup_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subgroup_chat_select_public ON public.subgroup_chat_messages;
CREATE POLICY subgroup_chat_select_public ON public.subgroup_chat_messages
  FOR SELECT USING (true);

-- Inserts go through service_role API routes only.
REVOKE INSERT, UPDATE, DELETE ON public.subgroup_chat_messages FROM anon, authenticated;

COMMIT;
