-- Migration: Add Payment Intents Table for PayMongo
-- Created: 2025-01-27 10:00
-- Description: Creates payment_intents table to track PayMongo payments before order creation

-- Payment Intents table for PayMongo
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paymongo_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    amount DECIMAL(8, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',
    status VARCHAR(30) DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'paid', 'failed', 'cancelled')),
    payment_method VARCHAR(50) DEFAULT 'gcash',
    order_data JSONB NOT NULL, -- Stores cart items, address, delivery info, etc.
    paymongo_response JSONB, -- Stores full PayMongo response
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Linked after order creation
    redirect_url TEXT, -- GCash checkout URL
    return_url TEXT, -- URL to return to after payment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_paymongo_id ON payment_intents(paymongo_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_customer ON payment_intents(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(order_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_intents_updated_at 
    BEFORE UPDATE ON payment_intents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes to existing payments table for better performance
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(payment_gateway);

-- Add qr_code_url column to payments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'qr_code_url'
    ) THEN
        ALTER TABLE payments ADD COLUMN qr_code_url VARCHAR(500);
    END IF;
END $$;

COMMENT ON TABLE payment_intents IS 'Stores PayMongo payment intents before order creation (pay-first flow)';
COMMENT ON COLUMN payment_intents.order_data IS 'JSON object containing cart items, delivery address, and order details';
COMMENT ON COLUMN payment_intents.paymongo_response IS 'Full PayMongo API response for debugging';
COMMENT ON COLUMN payment_intents.order_id IS 'Set after order is created upon successful payment';
