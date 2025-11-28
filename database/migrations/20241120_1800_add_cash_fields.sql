-- Add cash collection fields to deliveries table
-- Migration: 20241120_1800_add_cash_fields.sql

ALTER TABLE deliveries
ADD COLUMN cash_collected BOOLEAN DEFAULT false,
ADD COLUMN cash_amount DECIMAL(8, 2) DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN deliveries.cash_collected IS 'Whether cash payment has been collected by the rider';
COMMENT ON COLUMN deliveries.cash_amount IS 'Amount of cash collected for this delivery';