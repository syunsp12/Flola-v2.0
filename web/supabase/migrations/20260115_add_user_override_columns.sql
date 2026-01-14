-- Add user override columns to transactions table
ALTER TABLE transactions
ADD COLUMN user_amount NUMERIC,
ADD COLUMN user_date DATE,
ADD COLUMN user_description TEXT,
ADD COLUMN user_category_id BIGINT REFERENCES categories(id),
ADD COLUMN user_from_account_id UUID REFERENCES accounts(id),
ADD COLUMN user_to_account_id UUID REFERENCES accounts(id);

COMMENT ON COLUMN transactions.user_amount IS 'User overridden amount';
COMMENT ON COLUMN transactions.user_date IS 'User overridden date';
COMMENT ON COLUMN transactions.user_description IS 'User overridden description';
COMMENT ON COLUMN transactions.user_category_id IS 'User overridden category ID';
COMMENT ON COLUMN transactions.user_from_account_id IS 'User overridden source account ID';
COMMENT ON COLUMN transactions.user_to_account_id IS 'User overridden destination account ID';
