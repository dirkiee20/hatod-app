-- Create Admin User for HATOD
-- Run this script in Supabase SQL Editor to create an admin account
-- 
-- IMPORTANT: Change the email and password before running!
-- The password will be hashed using bcrypt with 12 salt rounds

-- ============================================
-- OPTION 1: Using SQL (Requires password hash)
-- ============================================
-- 
-- To generate a password hash, run: node generate_password_hash.js
-- Then replace the password_hash value below with the generated hash
--
-- Replace these values:
-- - 'admin@hatod.com' with your desired admin email
-- - The password_hash with a bcrypt hash of your desired password (generate using generate_password_hash.js)
-- - 'System Administrator' with your admin's full name
-- - '+1234567890' with your admin's phone number

INSERT INTO users (
    email, 
    password_hash, 
    full_name, 
    phone, 
    user_type, 
    email_verified, 
    is_active
)
VALUES (
    'admin@hatod.com',  -- ⚠️ CHANGE THIS EMAIL
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5J5x5x5xO',  -- ⚠️ CHANGE THIS HASH (password: admin123)
    'System Administrator',  -- ⚠️ CHANGE THIS NAME
    '+1234567890',  -- ⚠️ CHANGE THIS PHONE
    'admin',
    true,
    true
)
ON CONFLICT (email) DO UPDATE
SET 
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    user_type = 'admin',
    is_active = true,
    email_verified = true;

-- Verify the admin was created
SELECT 
    id,
    email,
    full_name,
    user_type,
    is_active,
    email_verified,
    created_at
FROM users 
WHERE email = 'admin@hatod.com' AND user_type = 'admin';

