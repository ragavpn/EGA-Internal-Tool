-- Migration to create KV table
-- Replace {{KV_TABLE}} with the desired table name
CREATE TABLE IF NOT EXISTS "{{KV_TABLE}}" (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Optional: create an index for prefix searches
CREATE INDEX IF NOT EXISTS "idx_{{KV_TABLE}}_key" ON "{{KV_TABLE}}" (key text_pattern_ops);

-- Enable Row Level Security (RLS) for the KV table
ALTER TABLE "{{KV_TABLE}}" ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to SELECT/INSERT/UPDATE/DELETE when an authenticated
-- JWT is present. The Supabase service_role key bypasses RLS so server-side operations still work.
-- Use DO block for conditional policy creation since IF NOT EXISTS is not supported in older PostgreSQL versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = '{{KV_TABLE}}' 
    AND policyname = 'allow_authenticated'
  ) THEN
    EXECUTE 'CREATE POLICY "allow_authenticated" ON "{{KV_TABLE}}"
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;
