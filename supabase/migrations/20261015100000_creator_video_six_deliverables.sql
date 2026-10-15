-- Unified Creator: per-project videos and six independently versioned deliverables.
-- Additive only: no migration of legacy project snapshots, files, locks or publication rows.
CREATE TABLE IF NOT EXISTS public.creator_videos (
  project_id text NOT NULL,
  video_id text NOT NULL CHECK (length(video_id) BETWEEN 1 AND 240),
  owner_user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 300),
  source text NOT NULL DEFAULT 'workspace',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_videos_pkey PRIMARY KEY (project_id,video_id),
  CONSTRAINT creator_videos_owner_identity UNIQUE (project_id,owner_user_id,video_id),
  CONSTRAINT creator_videos_project_owner_fk FOREIGN KEY (project_id,owner_user_id)
    REFERENCES public.creator_projects(project_id,owner_user_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS creator_videos_owner_updated_idx ON public.creator_videos(owner_user_id,updated_at DESC);

ALTER TABLE public.creator_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creator_videos_owner_select ON public.creator_videos;
CREATE POLICY creator_videos_owner_select ON public.creator_videos FOR SELECT TO authenticated
  USING (owner_user_id=(select auth.uid()));
DROP POLICY IF EXISTS creator_videos_owner_insert ON public.creator_videos;
CREATE POLICY creator_videos_owner_insert ON public.creator_videos FOR INSERT TO authenticated
  WITH CHECK (owner_user_id=(select auth.uid()));
DROP POLICY IF EXISTS creator_videos_owner_update ON public.creator_videos;
CREATE POLICY creator_videos_owner_update ON public.creator_videos FOR UPDATE TO authenticated
  USING (owner_user_id=(select auth.uid()))
  WITH CHECK (owner_user_id=(select auth.uid()));

CREATE TABLE IF NOT EXISTS public.creator_video_deliverables (
  project_id text NOT NULL,
  video_id text NOT NULL,
  deliverable_key text NOT NULL
    CHECK(deliverable_key IN ('script','subtitle','visual','sound','cover','publish')),
  owner_user_id uuid NOT NULL DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'not_started'
    CHECK(status IN ('not_started','working','review','confirmed','issue')),
  artifact_manifest jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK(jsonb_typeof(artifact_manifest)='array'),
  verification jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(verification)='object'),
  revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_video_deliverables_pkey PRIMARY KEY (project_id,video_id,deliverable_key),
  CONSTRAINT creator_video_deliverables_video_fk FOREIGN KEY (project_id,owner_user_id,video_id)
    REFERENCES public.creator_videos(project_id,owner_user_id,video_id) ON DELETE RESTRICT,
  CONSTRAINT creator_video_deliverable_confirmed_evidence
    CHECK(status <> 'confirmed' OR
      (verification->>'fileVerified')='true'
      AND (verification->>'qualityVerified')='true'
      AND (verification->>'humanApproved')='true')
);
CREATE INDEX IF NOT EXISTS creator_video_deliverables_owner_idx
  ON public.creator_video_deliverables(owner_user_id,project_id,video_id,updated_at DESC);

ALTER TABLE public.creator_video_deliverables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creator_video_deliverables_owner_select ON public.creator_video_deliverables;
CREATE POLICY creator_video_deliverables_owner_select ON public.creator_video_deliverables FOR SELECT TO authenticated
  USING (owner_user_id=(select auth.uid()));
DROP POLICY IF EXISTS creator_video_deliverables_owner_insert ON public.creator_video_deliverables;
CREATE POLICY creator_video_deliverables_owner_insert ON public.creator_video_deliverables FOR INSERT TO authenticated
  WITH CHECK (owner_user_id=(select auth.uid()));
DROP POLICY IF EXISTS creator_video_deliverables_owner_update ON public.creator_video_deliverables;
CREATE POLICY creator_video_deliverables_owner_update ON public.creator_video_deliverables FOR UPDATE TO authenticated
  USING (owner_user_id=(select auth.uid()))
  WITH CHECK (owner_user_id=(select auth.uid()));

REVOKE ALL ON public.creator_videos,public.creator_video_deliverables FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.creator_videos,public.creator_video_deliverables TO authenticated;
-- No DELETE grants: archival/restore is managed separately; no accidental purges.
COMMENT ON TABLE public.creator_videos IS 'Stable child Video identity of creator_projects; independent of prompt node branch labels.';
COMMENT ON TABLE public.creator_video_deliverables IS 'Per-video six creative deliverable records. Browser/file evidence remains metadata only; no binaries or claims of automatic verification.';
