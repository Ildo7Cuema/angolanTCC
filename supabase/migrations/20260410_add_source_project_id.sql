-- Migration: Add source_project_id to track migration from ante-projecto to TCC
-- Date: 2026-04-10

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Index for querying related projects
CREATE INDEX IF NOT EXISTS idx_projects_source_project_id ON projects(source_project_id);

-- Comment for documentation
COMMENT ON COLUMN projects.source_project_id IS 'References the ante-projecto from which this TCC was migrated';
