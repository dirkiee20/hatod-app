-- Migration: Add payment_settings table
-- Created: 2025-01-04 10:00
-- Description: Creates payment_settings table for storing payment-related configuration like QR codes

CREATE TABLE IF NOT EXISTS payment_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_settings_key ON payment_settings(key);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at 
    BEFORE UPDATE ON payment_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

