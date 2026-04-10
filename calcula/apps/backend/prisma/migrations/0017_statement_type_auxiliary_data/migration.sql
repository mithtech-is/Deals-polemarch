-- Add `auxiliary_data` to the statement_type enum.
ALTER TYPE statement_type ADD VALUE IF NOT EXISTS 'auxiliary_data' AFTER 'ratios_valuations';
