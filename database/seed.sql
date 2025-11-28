-- Seed Data for HATOD Database
-- This file contains minimal data for development and testing

-- Development test users with proper password hashes
-- Password for all test users: "password123"

-- Admin user
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'admin@hatod.com',
    '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm',
    'System Administrator',
    '+1234567890',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Customer user
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'customer@example.com',
    '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm',
    'John Customer',
    '+1234567891',
    'customer',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Restaurant user
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'restaurant@example.com',
    '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm',
    'Mario Restaurant',
    '+1234567892',
    'restaurant',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Delivery user
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'delivery@example.com',
    '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm',
    'Jane Delivery',
    '+1234567893',
    'rider',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'HATOD seed data inserted successfully!';
    RAISE NOTICE 'Created admin user for development.';
END $$;