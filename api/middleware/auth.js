import { unauthorized, forbidden } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (error) {
    return next(unauthorized('Invalid or expired token'));
  }
};

const normalizeRole = (role) => {
  if (role === 'delivery') return 'rider';
  return role;
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(unauthorized());
  }

  const normalizedRoles = roles.map(normalizeRole);
  const userRole = normalizeRole(req.user.role);

  if (!normalizedRoles.includes(userRole)) {
    return next(forbidden('You do not have permission to perform this action'));
  }

  return next();
};

