-- Migration: Add GCash payment fields to restaurants
-- Created: 2025-01-09 10:00
-- Description: Adds GCash account information to restaurants table for direct payment routing

-- Add GCash fields to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS gcash_mobile_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS gcash_qr_code_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS gcash_account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS gcash_enabled BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_gcash_enabled ON restaurants(gcash_enabled) WHERE gcash_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.gcash_mobile_number IS 'GCash mobile number for receiving payments (format: 09XXXXXXXXX)';
COMMENT ON COLUMN restaurants.gcash_qr_code_url IS 'URL to GCash QR code image for customer scanning';
COMMENT ON COLUMN restaurants.gcash_account_name IS 'Account name associated with GCash account';
COMMENT ON COLUMN restaurants.gcash_enabled IS 'Whether GCash payment is enabled for this restaurant';
