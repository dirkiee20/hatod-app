-- Migration: Add tiered delivery fees system
-- This replaces the simple delivery_fee with tiered pricing based on order amount

-- Drop the old delivery_fees table if it exists (or we can keep it and add new table)
-- For now, we'll create a new table for tiered fees

CREATE TABLE IF NOT EXISTS delivery_fee_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barangay VARCHAR(100) NOT NULL,
    min_order_amount DECIMAL(8, 2) NOT NULL,
    max_order_amount DECIMAL(8, 2) NOT NULL,
    delivery_fee DECIMAL(6, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(barangay, min_order_amount, max_order_amount)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_fee_tiers_barangay ON delivery_fee_tiers(barangay);
CREATE INDEX IF NOT EXISTS idx_delivery_fee_tiers_amounts ON delivery_fee_tiers(min_order_amount, max_order_amount);

-- Insert tiered delivery fees for all barangays
-- Tier 1: ₱500 & below
-- Tier 2: ₱501-₱1,000
-- Tier 3: ₱1,001-₱1,500

INSERT INTO delivery_fee_tiers (barangay, min_order_amount, max_order_amount, delivery_fee) VALUES
-- Brgy. Tayaga
('Barangay Tayaga', 0.00, 500.00, 30.00),
('Barangay Tayaga', 501.00, 1000.00, 50.00),
('Barangay Tayaga', 1001.00, 1500.00, 100.00),

-- Brgy. Bagacay
('Barangay Bagacay', 0.00, 500.00, 30.00),
('Barangay Bagacay', 501.00, 1000.00, 50.00),
('Barangay Bagacay', 1001.00, 1500.00, 100.00),

-- Brgy. Ladgaron
('Barangay Ladgaron', 0.00, 500.00, 30.00),
('Barangay Ladgaron', 501.00, 1000.00, 50.00),
('Barangay Ladgaron', 1001.00, 1500.00, 100.00),

-- Brgy. Magallanes
('Barangay Magallanes', 0.00, 500.00, 50.00),
('Barangay Magallanes', 501.00, 1000.00, 80.00),
('Barangay Magallanes', 1001.00, 1500.00, 120.00),

-- Brgy. Daywan
('Barangay Daywan', 0.00, 500.00, 50.00),
('Barangay Daywan', 501.00, 1000.00, 80.00),
('Barangay Daywan', 1001.00, 1500.00, 120.00),

-- Brgy. Sabang
('Barangay Sabang', 0.00, 500.00, 50.00),
('Barangay Sabang', 501.00, 1000.00, 80.00),
('Barangay Sabang', 1001.00, 1500.00, 120.00),

-- Brgy. Panatao (Note: This wasn't in the original list, but user mentioned it)
('Barangay Panatao', 0.00, 500.00, 50.00),
('Barangay Panatao', 501.00, 1000.00, 100.00),
('Barangay Panatao', 1001.00, 1500.00, 130.00),

-- Brgy. Wangke
('Barangay Wangke', 0.00, 500.00, 70.00),
('Barangay Wangke', 501.00, 1000.00, 100.00),
('Barangay Wangke', 1001.00, 1500.00, 130.00),

-- Brgy. Cabugo
('Barangay Cabugo', 0.00, 500.00, 80.00),
('Barangay Cabugo', 501.00, 1000.00, 110.00),
('Barangay Cabugo', 1001.00, 1500.00, 140.00),

-- Brgy. Urbiztundo (Note: user wrote "Urbitundo" in schema, but "Urbiztundo" in rates)
('Barangay Urbitundo', 0.00, 500.00, 90.00),
('Barangay Urbitundo', 501.00, 1000.00, 120.00),
('Barangay Urbitundo', 1001.00, 1500.00, 150.00),

-- Brgy. Taganito
('Barangay Taganito', 0.00, 500.00, 120.00),
('Barangay Taganito', 501.00, 1000.00, 150.00),
('Barangay Taganito', 1001.00, 1500.00, 200.00),

-- Brgy. Hayanggabon
('Barangay Hayanggabon', 0.00, 500.00, 150.00),
('Barangay Hayanggabon', 501.00, 1000.00, 200.00),
('Barangay Hayanggabon', 1001.00, 1500.00, 250.00),

-- Brgy. Cagdianao
('Barangay Cagdianao', 0.00, 500.00, 200.00),
('Barangay Cagdianao', 501.00, 1000.00, 250.00),
('Barangay Cagdianao', 1001.00, 1500.00, 300.00),

-- PGMC
('PGMC', 0.00, 500.00, 250.00),
('PGMC', 501.00, 1000.00, 300.00),
('PGMC', 1001.00, 1500.00, 350.00)

ON CONFLICT (barangay, min_order_amount, max_order_amount) DO NOTHING;

