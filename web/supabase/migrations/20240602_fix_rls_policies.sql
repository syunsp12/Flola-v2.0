-- history_fetch_requests テーブルの RLS (Row-Level Security) 設定
-- エラー "new row violates row-level security policy" の修正用

-- 1. RLSの有効化
ALTER TABLE history_fetch_requests ENABLE ROW LEVEL SECURITY;

-- 2. アプリケーション（画面）からの操作を許可
-- 認証済みユーザーに対して、全ての操作（INSERT, SELECT, UPDATE, DELETE）を許可します
CREATE POLICY "Allow all for authenticated users" ON history_fetch_requests
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 3. API (GAS連携) からの操作を許可
-- APIルートは 'anon' ロールでDBに接続するため、必要な権限を付与します
-- ※ APIエンドポイント側で ADMIN_API_KEY による認証を行っているため、ここでは許可を与えます

-- GASがPendingリクエストを取得するために必要
CREATE POLICY "Allow select for anon" ON history_fetch_requests
FOR SELECT TO anon
USING (true);

-- GASがステータスを更新するために必要
CREATE POLICY "Allow update for anon" ON history_fetch_requests
FOR UPDATE TO anon
USING (true);
