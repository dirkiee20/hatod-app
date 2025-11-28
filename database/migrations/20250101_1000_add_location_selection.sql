-- Add barangay/location field to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS barangay VARCHAR(100);

-- Create delivery_fees table for barangay-specific delivery fees
CREATE TABLE IF NOT EXISTS delivery_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barangay VARCHAR(100) UNIQUE NOT NULL,
    delivery_fee DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default barangays (delivery fees will be set later)
INSERT INTO delivery_fees (barangay, delivery_fee) VALUES
    ('Barangay Tayaga', 0.00),
    ('Barangay Bagacay', 0.00),
    ('Barangay Ladgaron', 0.00),
    ('Barangay Magallanes', 0.00),
    ('Barangay Daywan', 0.00),
    ('Barangay Sabang', 0.00),
    ('Barangay Wangke', 0.00),
    ('Barangay Cabugo', 0.00),
    ('Barangay Urbitundo', 0.00),
    ('Barangay Taganito', 0.00),
    ('Barangay Hayanggabon', 0.00),
    ('Barangay Cagdianao', 0.00),
    ('PGMC', 0.00)
ON CONFLICT (barangay) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_barangay ON users(barangay);
CREATE INDEX IF NOT EXISTS idx_delivery_fees_barangay ON delivery_fees(barangay);

