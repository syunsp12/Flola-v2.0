-- Add is_ai_suggested column to transactions table
ALTER TABLE transactions 
ADD COLUMN is_ai_suggested BOOLEAN DEFAULT FALSE;

-- Update existing records to have false (optional, as default handles it)
UPDATE transactions SET is_ai_suggested = FALSE WHERE is_ai_suggested IS NULL;
