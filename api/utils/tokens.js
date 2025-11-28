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

export const signAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });

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

