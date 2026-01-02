-- accountsテーブルにロゴURL保存用のカラムを追加
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS icon_url TEXT;
