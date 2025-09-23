-- Migration to create KV table
-- Replace kv_store_354d5d14 with the desired table name
CREATE TABLE IF NOT EXISTS "kv_store_354d5d14" (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Optional: create an index for prefix searches
CREATE INDEX IF NOT EXISTS "idx_kv_store_354d5d14_key" ON "kv_store_354d5d14" (key text_pattern_ops);

-- Enable Row Level Security (RLS) for the KV table
ALTER TABLE "kv_store_354d5d14" ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to SELECT/INSERT/UPDATE/DELETE when an authenticated
-- JWT is present. The Supabase service_role key bypasses RLS so server-side operations still work.
-- Use DO block for conditional policy creation since IF NOT EXISTS is not supported in older PostgreSQL versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'kv_store_354d5d14' 
    AND policyname = 'allow_authenticated'
  ) THEN
    EXECUTE 'CREATE POLICY "allow_authenticated" ON "kv_store_354d5d14"
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;
