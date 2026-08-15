-- Unique site visitors (cookie UUID). Displayed user count = base + rows here.

BEGIN;

CREATE TABLE IF NOT EXISTS public.site_visitors (
  id uuid PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_visitors_last_seen_idx
  ON public.site_visitors (last_seen_at DESC);

ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;

-- Writes only via service role from /api/site-stats.
DROP POLICY IF EXISTS site_visitors_no_client ON public.site_visitors;
CREATE POLICY site_visitors_no_client ON public.site_visitors
  FOR ALL USING (false) WITH CHECK (false);

COMMIT;
