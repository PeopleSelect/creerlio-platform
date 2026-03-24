-- ─────────────────────────────────────────────────────────────────────────────
-- AI Video Generation Module
-- Tables: video_projects, video_scenes, video_assets
-- ─────────────────────────────────────────────────────────────────────────────

-- video_projects ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid REFERENCES business_profiles(id) ON DELETE SET NULL,

  title           text NOT NULL,
  description     text,
  style           text NOT NULL DEFAULT 'corporate',   -- corporate|cinematic|social|product
  aspect_ratio    text NOT NULL DEFAULT '16:9',         -- 16:9|9:16|1:1
  duration_secs   integer NOT NULL DEFAULT 60,

  script          text,                                 -- full narration script
  status          text NOT NULL DEFAULT 'draft',        -- draft|processing|completed|failed
  error_message   text,

  final_video_url text,                                 -- Supabase Storage public URL
  thumbnail_url   text,

  runway_task_ids  jsonb DEFAULT '[]'::jsonb,           -- array of Runway task IDs
  elevenlabs_job_id text,

  metadata        jsonb DEFAULT '{}'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- video_scenes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_scenes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  scene_order     integer NOT NULL,

  title           text,
  prompt          text NOT NULL,        -- Runway text-to-video prompt
  narration       text,                 -- ElevenLabs narration for this scene
  duration_secs   integer NOT NULL DEFAULT 5,

  status          text NOT NULL DEFAULT 'pending',  -- pending|generating|completed|failed
  runway_task_id  text,
  video_url       text,                 -- raw Runway output URL
  stored_url      text,                 -- Supabase Storage copy

  error_message   text,
  attempts        integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- video_assets ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,

  asset_type      text NOT NULL,        -- scene_video|voice_track|final_video|thumbnail
  file_path       text NOT NULL,        -- Supabase Storage path
  public_url      text,
  mime_type       text,
  size_bytes      bigint,
  duration_secs   numeric,

  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_video_projects_user_id    ON video_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_business_id ON video_projects(business_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_status     ON video_projects(status);
CREATE INDEX IF NOT EXISTS idx_video_scenes_project_id   ON video_scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_video_scenes_order        ON video_scenes(project_id, scene_order);
CREATE INDEX IF NOT EXISTS idx_video_assets_project_id   ON video_assets(project_id);

-- Updated-at trigger ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_video_projects_updated_at ON video_projects;
CREATE TRIGGER trg_video_projects_updated_at
  BEFORE UPDATE ON video_projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_video_scenes_updated_at ON video_scenes;
CREATE TRIGGER trg_video_scenes_updated_at
  BEFORE UPDATE ON video_scenes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS ─────────────────────────────────────────────────────────────────────────
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_scenes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assets   ENABLE ROW LEVEL SECURITY;

-- video_projects
DROP POLICY IF EXISTS "video_projects_select_own" ON video_projects;
CREATE POLICY "video_projects_select_own" ON video_projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "video_projects_insert_own" ON video_projects;
CREATE POLICY "video_projects_insert_own" ON video_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "video_projects_update_own" ON video_projects;
CREATE POLICY "video_projects_update_own" ON video_projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "video_projects_delete_own" ON video_projects;
CREATE POLICY "video_projects_delete_own" ON video_projects
  FOR DELETE USING (auth.uid() = user_id);

-- video_scenes (access via project ownership)
DROP POLICY IF EXISTS "video_scenes_select_own" ON video_scenes;
CREATE POLICY "video_scenes_select_own" ON video_scenes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "video_scenes_insert_own" ON video_scenes;
CREATE POLICY "video_scenes_insert_own" ON video_scenes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "video_scenes_update_own" ON video_scenes;
CREATE POLICY "video_scenes_update_own" ON video_scenes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "video_scenes_delete_own" ON video_scenes;
CREATE POLICY "video_scenes_delete_own" ON video_scenes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

-- video_assets (access via project ownership)
DROP POLICY IF EXISTS "video_assets_select_own" ON video_assets;
CREATE POLICY "video_assets_select_own" ON video_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "video_assets_insert_own" ON video_assets;
CREATE POLICY "video_assets_insert_own" ON video_assets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "video_assets_delete_own" ON video_assets;
CREATE POLICY "video_assets_delete_own" ON video_assets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM video_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

-- Storage bucket for video output ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-projects',
  'video-projects',
  true,
  524288000,  -- 500 MB
  ARRAY['video/mp4','video/webm','audio/mpeg','audio/mp4','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "video_projects_storage_read" ON storage.objects;
CREATE POLICY "video_projects_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-projects');

DROP POLICY IF EXISTS "video_projects_storage_upload" ON storage.objects;
CREATE POLICY "video_projects_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'video-projects' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "video_projects_storage_delete" ON storage.objects;
CREATE POLICY "video_projects_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-projects' AND auth.role() = 'authenticated'
  );
