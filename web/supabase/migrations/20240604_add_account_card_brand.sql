-- accountsテーブルにカードブランド保存用のカラムを追加
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS card_brand TEXT;
