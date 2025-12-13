import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { internal } from './httpError.js';

dotenv.config();

const {
  JWT_SECRET = 'change-this-secret',
  JWT_EXPIRES_IN = '1h',
  JWT_REFRESH_SECRET = 'change-this-refresh-secret',
  JWT_REFRESH_EXPIRES_IN = '7d'
} = process.env;

export const signAccessToken = (payload) => {
  if (!JWT_SECRET || JWT_SECRET === 'change-this-secret') {
    throw new Error('JWT_SECRET is not configured. Please set JWT_SECRET environment variable.');
  }
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    console.error('Error signing access token:', error);
    throw new Error('Failed to sign access token');
  }
};

export const signRefreshToken = (payload) => {
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET === 'change-this-refresh-secret') {
    throw new Error('JWT_REFRESH_SECRET is not configured. Please set JWT_REFRESH_SECRET environment variable.');
  }
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN
    });
  } catch (error) {
    console.error('Error signing refresh token:', error);
    throw new Error('Failed to sign refresh token');
  }
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw internal('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw internal('Invalid refresh token');
  }
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} Verification token
 */
export const generateVerificationToken = (userId, email) => {
  if (!JWT_SECRET || JWT_SECRET === 'change-this-secret') {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    return jwt.sign(
      { 
        sub: userId, 
        email: email.toLowerCase(),
        type: 'email_verification'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  } catch (error) {
    console.error('Error generating verification token:', error);
    throw new Error('Failed to generate verification token');
  }
};

/**
 * Verify email verification token
 * @param {string} token - Verification token
 * @returns {object} Decoded token payload
 */
export const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Verification token has expired');
    }
    throw new Error('Invalid verification token');
  }
};

