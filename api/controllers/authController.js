import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  badRequest,
  conflict,
  unauthorized,
  internal
} from '../utils/httpError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../utils/tokens.js';

const allowedRoles = ['customer', 'restaurant', 'rider', 'admin'];
const publicRegistrationRoles = ['customer', 'restaurant'];
const mapDbRoleToClient = (role) => (role === 'rider' ? 'delivery' : role);

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role = 'customer' } = req.body;

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

  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, full_name AS "fullName", user_type AS role, created_at AS "createdAt"`,
    [email.toLowerCase(), passwordHash, fullName, phone ?? null, role, false]
  );

  const user = result.rows[0];
  
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
        }
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

