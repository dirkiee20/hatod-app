-- Add email verification token column to users table
-- This allows us to store verification tokens for email verification

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token 
ON users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.email_verification_token IS 'Token used for email verification';
COMMENT ON COLUMN users.email_verification_token_expires_at IS 'Expiration time for email verification token';

