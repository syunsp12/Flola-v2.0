-- Re-apply RLS settings for history_fetch_requests to ensure they exist

-- 1. Enable RLS
ALTER TABLE IF EXISTS history_fetch_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid duplication errors
DROP POLICY IF EXISTS "Allow all for authenticated users" ON history_fetch_requests;
DROP POLICY IF EXISTS "Allow select for anon" ON history_fetch_requests;
DROP POLICY IF EXISTS "Allow update for anon" ON history_fetch_requests;

-- 3. Re-create policies

-- Authenticated users (App) - Allow everything (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Allow all for authenticated users" ON history_fetch_requests
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Anon users (GAS/API) - SELECT (for checking pending jobs)
CREATE POLICY "Allow select for anon" ON history_fetch_requests
FOR SELECT TO anon
USING (true);

-- Anon users (GAS/API) - UPDATE (for updating status)
CREATE POLICY "Allow update for anon" ON history_fetch_requests
FOR UPDATE TO anon
USING (true);
