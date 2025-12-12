-- Migration: Add Barangay Claver to delivery fee tiers
-- Date: 2025-01-07
-- Description: Adds Barangay Claver with tiered delivery fees

-- Add Claver barangay with tiered delivery fees
INSERT INTO delivery_fee_tiers (barangay, min_order_amount, max_order_amount, delivery_fee, is_active) VALUES
-- Brgy. Claver
('Barangay Claver', 0.00, 500.00, 30.00, true),
('Barangay Claver', 501.00, 1000.00, 50.00, true),
('Barangay Claver', 1001.00, 1500.00, 100.00, true)

ON CONFLICT (barangay, min_order_amount, max_order_amount) 
DO UPDATE SET 
    delivery_fee = EXCLUDED.delivery_fee,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

