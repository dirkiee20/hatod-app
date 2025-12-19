-- Migration: Add qr_code_url column to payments table
-- Created: 2025-01-09 11:00
-- Description: Stores QR code URL for wallet payments (e.g., GCash)

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(500);

COMMENT ON COLUMN payments.qr_code_url IS 'URL to a payment QR code image (e.g., GCash QR)';


