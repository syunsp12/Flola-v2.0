-- Security Fix: Remove excessive permissions for anon users on history_fetch_requests
-- These operations should only be performed via the API (using Service Role) or by authenticated users.

-- 1. Drop the insecure policies for anon users
DROP POLICY IF EXISTS "Allow select for anon" ON history_fetch_requests;
DROP POLICY IF EXISTS "Allow update for anon" ON history_fetch_requests;
