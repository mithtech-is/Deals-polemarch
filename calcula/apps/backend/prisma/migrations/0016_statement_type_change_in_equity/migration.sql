-- Add `change_in_equity` to the statement_type enum.
ALTER TYPE statement_type ADD VALUE IF NOT EXISTS 'change_in_equity' AFTER 'cashflow';
