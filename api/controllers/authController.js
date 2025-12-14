import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  badRequest,
  conflict,
  unauthorized,
  internal,
  notFound
} from '../utils/httpError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  verifyVerificationToken
} from '../utils/tokens.js';
import { sendVerificationEmail } from '../utils/email.js';

const allowedRoles = ['customer', 'restaurant', 'rider', 'admin'];
const publicRegistrationRoles = ['customer', 'restaurant'];
const mapDbRoleToClient = (role) => (role === 'rider' ? 'delivery' : role);

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role = 'customer' } = req.body;

  console.log('[Register] Starting registration for:', email);

  if (!allowedRoles.includes(role)) {
    throw badRequest('Invalid role specified');
  }

  if (!publicRegistrationRoles.includes(role)) {
    throw unauthorized('You are not allowed to self-register with this role');
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase()
  ]);

  if (existing.rowCount > 0) {
    throw conflict('Email already registered');
  }

  console.log('[Register] Hashing password...');
  const passwordHash = await hashPassword(password);
  console.log('[Register] Password hashed successfully');
  
  // Check if email verification columns exist
  let hasEmailVerification = false;
  try {
    console.log('[Register] Checking for email verification columns...');
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verification_token', 'email_verification_token_expires_at')
    `);
    hasEmailVerification = columnCheck.rows.length === 2;
    console.log(`[Register] Email verification columns: ${hasEmailVerification ? 'EXIST' : 'NOT FOUND'}`);
  } catch (checkError) {
    console.warn('[Register] Could not check for email verification columns:', checkError.message);
  }
  
  let verificationToken = null;
  let tokenExpiresAt = null;
  
  if (hasEmailVerification) {
    // Generate verification token
    verificationToken = generateVerificationToken(
      'temp', // Will be replaced after user is created
      email.toLowerCase()
    );
    
    // Calculate token expiration (24 hours from now)
    tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);
  }

  console.log('[Register] Inserting user into database...');
  let result;
  try {
    if (hasEmailVerification) {
      console.log('[Register] Using email verification columns');
      result = await query(
        `INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, email_verification_token, email_verification_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, full_name AS "fullName", user_type AS role, created_at AS "createdAt"`,
        [
          email.toLowerCase(),
          passwordHash,
          fullName,
          phone ?? null,
          role,
          false,
          verificationToken,
          tokenExpiresAt
        ]
      );
    } else {
      console.log('[Register] Inserting without email verification columns');
      // Fallback: insert without verification columns
      result = await query(
        `INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, full_name AS "fullName", user_type AS role, created_at AS "createdAt"`,
        [
          email.toLowerCase(),
          passwordHash,
          fullName,
          phone ?? null,
          role,
          false
        ]
      );
    }
    console.log('[Register] User inserted successfully. User ID:', result.rows[0].id);
  } catch (dbError) {
    console.error('[Register] Database error:', dbError.message);
    console.error('[Register] Database error details:', dbError);
    throw dbError; // Re-throw to be handled by error handler
  }

  const user = result.rows[0];
  
  // Only process email verification if columns exist
  if (hasEmailVerification) {
    try {
      // Regenerate token with actual user ID
      const finalVerificationToken = generateVerificationToken(user.id, user.email);
      
      // Update with final token
      await query(
        `UPDATE users 
         SET email_verification_token = $1, email_verification_token_expires_at = $2
         WHERE id = $3`,
        [finalVerificationToken, tokenExpiresAt, user.id]
      );
      
      // Send verification email (don't block registration if it fails)
      try {
        await sendVerificationEmail(user.email, fullName, finalVerificationToken);
        console.log(`Verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError.message);
        console.error('Email error details:', emailError);
        // Continue with registration even if email fails
        // Log but don't throw - registration should succeed
      }
    } catch (verificationError) {
      console.error('Error in email verification setup:', verificationError.message);
      console.error('Verification error details:', verificationError);
      // Don't fail registration if verification setup fails
      // User is already created, just log the error
    }
  } else {
    console.warn('Email verification columns not found. Registration succeeded but email verification is disabled.');
    console.warn('Please run the migration: database/migrations/20250108_1000_add_email_verification_token.sql');
  }
  
  try {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    const refreshToken = signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      status: 'success',
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken
        },
        message: 'Registration successful! Please check your email to verify your account.'
      }
    });
  } catch (tokenError) {
    console.error('Error generating tokens during registration:', tokenError);
    throw internal('Failed to generate authentication tokens');
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    `SELECT id, email, password_hash, full_name AS "fullName", user_type AS role, is_active AS "isActive", barangay
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rowCount === 0) {
    throw unauthorized('Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.isActive) {
    throw unauthorized('Account is disabled');
  }

  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    throw unauthorized('Invalid email or password');
  }

  delete user.password_hash;
  user.role = mapDbRoleToClient(user.role);
  // Keep barangay in response for location-based redirects

  try {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: mapDbRoleToClient(user.role)
    });
    const refreshToken = signRefreshToken({
      sub: user.id,
      email: user.email,
      role: mapDbRoleToClient(user.role)
    });

    res.json({
      status: 'success',
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (tokenError) {
    console.error('Error generating tokens:', tokenError);
    throw internal('Failed to generate authentication tokens');
  }
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw badRequest('Missing refresh token');
  }

  const payload = verifyRefreshToken(refreshToken);

  const accessToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: payload.role
  });

  res.json({
    status: 'success',
    data: {
      accessToken
    }
  });
});

/**
 * Verify email address using verification token
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw badRequest('Verification token is required');
  }

  // Verify token
  let decoded;
  try {
    decoded = verifyVerificationToken(token);
  } catch (error) {
    throw badRequest(error.message || 'Invalid or expired verification token');
  }

  // Find user by token
  const result = await query(
    `SELECT id, email, email_verified, email_verification_token_expires_at
     FROM users 
     WHERE email_verification_token = $1 AND email = $2`,
    [token, decoded.email.toLowerCase()]
  );

  if (result.rowCount === 0) {
    throw notFound('Verification token not found');
  }

  const user = result.rows[0];

  // Check if already verified
  if (user.email_verified) {
    return res.json({
      status: 'success',
      message: 'Email is already verified'
    });
  }

  // Check if token expired
  if (new Date() > new Date(user.email_verification_token_expires_at)) {
    throw badRequest('Verification token has expired. Please request a new one.');
  }

  // Verify email
  await query(
    `UPDATE users 
     SET email_verified = true,
         email_verification_token = NULL,
         email_verification_token_expires_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id]
  );

  res.json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

/**
 * Resend verification email
 */
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw badRequest('Email is required');
  }

  // Find user
  const result = await query(
    `SELECT id, email, full_name, email_verified
     FROM users 
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rowCount === 0) {
    // Don't reveal if email exists for security
    return res.json({
      status: 'success',
      message: 'If the email exists, a verification email has been sent'
    });
  }

  const user = result.rows[0];

  // Check if already verified
  if (user.email_verified) {
    return res.json({
      status: 'success',
      message: 'Email is already verified'
    });
  }

  // Generate new verification token
  const verificationToken = generateVerificationToken(user.id, user.email);
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

  // Update token in database
  await query(
    `UPDATE users 
     SET email_verification_token = $1,
         email_verification_token_expires_at = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [verificationToken, tokenExpiresAt, user.id]
  );

  // Send verification email
  try {
    await sendVerificationEmail(user.email, user.full_name, verificationToken);
    res.json({
      status: 'success',
      message: 'Verification email sent successfully'
    });
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    throw internal('Failed to send verification email. Please try again later.');
  }
});

