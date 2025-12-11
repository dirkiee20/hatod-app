-- Migration: Replace Barangay Espina with Barangay Gigaquit
-- Date: 2025-01-06
-- Description: Removes Espina barangay and adds Gigaquit barangay with tiered delivery fees

-- Remove all Espina delivery fee tiers
DELETE FROM delivery_fee_tiers WHERE barangay = 'Barangay Espina';

-- Add Gigaquit barangay with tiered delivery fees
INSERT INTO delivery_fee_tiers (barangay, min_order_amount, max_order_amount, delivery_fee, is_active) VALUES
-- Brgy. Gigaquit
('Barangay Gigaquit', 0.00, 500.00, 30.00, true),
('Barangay Gigaquit', 501.00, 1000.00, 50.00, true),
('Barangay Gigaquit', 1001.00, 1500.00, 100.00, true)

ON CONFLICT (barangay, min_order_amount, max_order_amount) 
DO UPDATE SET 
    delivery_fee = EXCLUDED.delivery_fee,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

