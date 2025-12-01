-- Migration: Add Barangay Espina with tiered delivery fees
-- Date: 2025-01-05
-- Description: Adds Espina barangay to the delivery fee tiers

INSERT INTO delivery_fee_tiers (barangay, min_order_amount, max_order_amount, delivery_fee, is_active) VALUES
-- Brgy. Espina
('Barangay Espina', 0.00, 500.00, 30.00, true),
('Barangay Espina', 501.00, 1000.00, 50.00, true),
('Barangay Espina', 1001.00, 1500.00, 100.00, true)

ON CONFLICT (barangay, min_order_amount, max_order_amount) 
DO UPDATE SET 
    delivery_fee = EXCLUDED.delivery_fee,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

